/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver-protocol/browser.js'
import type { LanguageClientOptions, MessageTransports } from 'vscode-languageclient/browser.js'
import { CloseAction, ErrorAction, State } from 'vscode-languageclient/browser.js'
import type { WorkerConfigOptionsDirect, WorkerConfigOptionsParams } from 'monaco-languageclient'
import { MonacoLanguageClient } from 'monaco-languageclient'
import { createUrl } from 'monaco-languageclient/tools'
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc'
import type { Logger } from '@nexp/front-lib/platform'
import type {
  CodeEnvironment,
  ConnectionConfig,
  LanguageClientConfig,
  LanguageClientError,
  LanguageClientRestartOptions,
} from './types'
import { ManagedServiceImpl } from './service'

export class LanguageClient extends ManagedServiceImpl {
  private _client?: MonacoLanguageClient
  private _worker?: Worker
  private _port?: MessagePort

  private _config: ConnectionConfig
  private _clientOptions: LanguageClientOptions
  private _restartOptions?: LanguageClientRestartOptions

  public readonly name: string
  public readonly log: Logger

  constructor(
    public readonly env: CodeEnvironment,
    config: LanguageClientConfig,
  ) {
    super()
    this.name = config.name ?? 'Language Client'
    this.log = env.context.log
    this._clientOptions = config.clientOptions
    this._config = config.connection
    this._restartOptions = config.restartOptions
  }

  public get client(): MonacoLanguageClient | undefined {
    return this._client
  }

  public get worker(): Worker | undefined {
    return this._worker
  }

  public get isRunning(): boolean {
    return Boolean(this._client?.isRunning())
  }

  protected async doStartup(): Promise<void> {
    if (this._client?.isRunning() ?? false) {
      this.log.i('monaco-languageclient already running when start!')
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      const conConfig = this._config
      const conOptions = conConfig.options

      if (
        conOptions.$type === 'WebSocketDirect' ||
        conOptions.$type === 'WebSocketParams' ||
        conOptions.$type === 'WebSocketUrl'
      ) {
        const webSocket =
          conOptions.$type === 'WebSocketDirect' ? conOptions.webSocket : new WebSocket(createUrl(conOptions))
        this._initWebSocket(webSocket, resolve, reject).catch(e => this.log.e('Error initializing websocket', e))
      } else {
        // init of worker and start of languageclient can be handled directly, because worker available already
        this._initWorker(conOptions, resolve, reject).catch(e => this.log.e('Error initializing websocket', e))
      }
    })
  }

  /**
   * Restart the languageclient with options to control worker handling
   *
   * @param updatedWorker Set a new worker here that should be used. keepWorker has no effect then, as we want to dispose of the prior workers
   * @param disposeWorker Set to false if worker should not be disposed
   */
  public async restart(updatedWorker?: Worker, disposeWorker = true): Promise<void> {
    await this.stop(disposeWorker)
    this._worker = updatedWorker
    this.log.i('Re-Starting monaco-languageclient')
    return this.start()
  }

  private async _initWebSocket(webSocket: WebSocket, resolve: () => void, reject: (reason?: unknown) => void) {
    let messageTransports = this._config.messageTransports
    if (messageTransports === undefined) {
      const iWebSocket = toSocket(webSocket)
      messageTransports = {
        reader: new WebSocketMessageReader(iWebSocket),
        writer: new WebSocketMessageWriter(iWebSocket),
      }
    }
    // if websocket is already open, then start the languageclient directly
    if (webSocket.readyState === WebSocket.OPEN) {
      await this._doStart(messageTransports, resolve, reject)
    }
    // otherwise start on open
    webSocket.onopen = async () => {
      await this._doStart(messageTransports, resolve, reject)
    }
    webSocket.onerror = (ev: Event) => {
      reject({
        message: `Language client (${this.name}): Websocket connection failed.`,
        error: (ev as ErrorEvent).error ?? 'No error was provided.',
      } satisfies LanguageClientError)
    }
  }

  private async _initWorker(
    lccOptions: WorkerConfigOptionsDirect | WorkerConfigOptionsParams,
    resolve: () => void,
    reject: (reason?: unknown) => void,
  ) {
    if (!this._worker) {
      if (lccOptions.$type === 'WorkerConfig') {
        const workerConfig = lccOptions as WorkerConfigOptionsParams
        this._worker = new Worker(workerConfig.url.href, {
          type: workerConfig.type,
          name: workerConfig.workerName,
        })

        this._worker.onerror = ev => {
          reject({
            message: `Language client (${this.name}): Illegal worker configuration detected.`,
            error: (ev as ErrorEvent).error ?? 'No error was provided.',
          } satisfies LanguageClientError)
        }
      } else {
        const workerDirectConfig = lccOptions as WorkerConfigOptionsDirect
        this._worker = workerDirectConfig.worker
      }
      if (lccOptions.messagePort !== undefined) {
        this._port = lccOptions.messagePort
      }
    }

    const portOrWorker = this._port ? this._port : this._worker
    let messageTransports = this._config.messageTransports
    if (messageTransports === undefined) {
      messageTransports = {
        reader: new BrowserMessageReader(portOrWorker),
        writer: new BrowserMessageWriter(portOrWorker),
      }
    }

    await this._doStart(messageTransports, resolve, reject)
  }

  protected async _doStart(transports: MessageTransports, resolve: () => void, reject: (reason?: unknown) => void) {
    let starting = true
    // do not perform another start attempt if already running
    if (this._client?.isRunning()) {
      this.log.i('monaco-languageclient already running!')
      resolve()
    }

    const mlcConfig = {
      name: this.name,
      clientOptions: {
        // disable the default error handler...
        errorHandler: {
          error: (e: Error) => {
            if (starting) {
              reject(`Error occurred in language client: ${e}`)
              return { action: ErrorAction.Shutdown }
            } else {
              return { action: ErrorAction.Continue }
            }
          },
          closed: () => ({ action: CloseAction.DoNotRestart }),
        },
        // ...but allow to override all options
        ...this._clientOptions,
      },
      messageTransports: transports,
    }
    this._client = new MonacoLanguageClient(mlcConfig)

    const conOptions = this._config.options
    this._configRestart(transports, this._restartOptions)

    const isWebSocket =
      conOptions.$type === 'WebSocketParams' ||
      conOptions.$type === 'WebSocketUrl' ||
      conOptions.$type === 'WebSocketDirect'

    transports.reader.onClose(async () => {
      await this._client?.stop()
      if (isWebSocket && conOptions.stopOptions !== undefined) {
        const stopOptions = conOptions.stopOptions
        stopOptions.onCall(this.client)
        if (stopOptions.reportStatus !== undefined) {
          this.log.i(this._status().join('\n'))
        }
      }
    })

    try {
      await this._client.start()
      if (isWebSocket && conOptions.startOptions !== undefined) {
        const startOptions = conOptions.startOptions
        startOptions.onCall(this.client)
        if (startOptions.reportStatus !== undefined) {
          this.log.i(this._status().join('\n'))
        }
      }
    } catch (e: unknown) {
      reject({
        message: `Language client (${this.name}): Start was unsuccessful.`,
        error: Object.hasOwn(e ?? {}, 'cause') ? (e as Error) : 'No error was provided.',
      } satisfies LanguageClientError)
    }
    this.log.i(`Language client (${this.name}): Started successfully.`)
    resolve()
    starting = false
  }

  private _configRestart(messageTransports: MessageTransports, restartOptions?: LanguageClientRestartOptions) {
    if (!restartOptions) return
    let retry = 0

    const readerOnError = messageTransports.reader.onError(() => restartLC)
    const readerOnClose = messageTransports.reader.onClose(() => restartLC)

    const restartLC = async () => {
      if (this.isRunning) {
        try {
          readerOnError.dispose()
          readerOnClose.dispose()

          await this.restart(this._worker, restartOptions.keepWorker)
        } finally {
          retry++
          if (retry > restartOptions.retries && !this.isRunning) {
            this.log.i('Disabling Language Client. Failed to start client after 5 retries')
          } else {
            setTimeout(() => {
              this.restart(this._worker, restartOptions.keepWorker).catch(e =>
                this.log.e('Error restarting language client', e),
              )
            }, restartOptions.timeout)
          }
        }
      }
    }
  }

  protected disposeWorker() {
    this._worker?.terminate()
    this._worker = undefined
  }

  public async doShutdown(disposeWorker = true): Promise<void> {
    if (!this.isRunning) return
    try {
      await this._client?.dispose()
      this._client = undefined
      this.log.i('monaco-languageclient were successfully disposed.')
    } catch (e) {
      throw {
        message: `Language client (${this.name}): Disposing the monaco-languageclient resulted in error.`,
        error: Object.hasOwn(e ?? {}, 'cause') ? (e as Error) : 'No error was provided.',
      } satisfies LanguageClientError as any
    } finally {
      // always terminate the worker if desired
      if (disposeWorker) this.disposeWorker()
    }
  }

  private _status() {
    const status: string[] = []
    const client = this.client
    status.push('status:')
    status.push(`LanguageClient: ${client?.name ?? 'Language Client'} is in a '${State[client?.state ?? 1]}' state`)
    return status
  }
}
