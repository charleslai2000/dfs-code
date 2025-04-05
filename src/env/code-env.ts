import * as vscode from 'vscode'
// eslint-disable-next-line import/order
import type * as monaco from '@codingame/monaco-vscode-editor-api'

import type { IEditorOptions } from '@codingame/monaco-vscode-api'
import { LogLevel } from '@codingame/monaco-vscode-api'
import type { VscodeApiConfig } from 'monaco-languageclient/vscode/services'
import { initServices, mergeServices } from 'monaco-languageclient/vscode/services'
import type { IReference } from '@codingame/monaco-vscode-api/monaco'
import { DisposableStore } from '@codingame/monaco-vscode-api/monaco'
import type { ICodeEditor } from '@codingame/monaco-vscode-api/vscode/vs/editor/browser/editorBrowser'
import type { Logger } from 'monaco-languageclient/tools'
import { ConsoleLogger } from 'monaco-languageclient/tools'
import type { RegisterExtensionResult, IExtensionManifest } from '@codingame/monaco-vscode-api/extensions'
import { ExtensionHostKind, getExtensionManifests, registerExtension } from '@codingame/monaco-vscode-api/extensions'
import type { UiContext, WorkerProgress } from '@nexp/front-lib/platform'
import type { LanguageClientOptions } from 'vscode-languageclient/browser'
import type {
  CodeEditor,
  CodeEditorOptions,
  CodeEnvironment,
  CodeOptions,
  ComputeLanguageKind,
  ExtensionConfig,
  WorkerLoader,
} from './types'
import type { LanguageClientConfig } from './lsp-client'
import { LanguageClient } from './lsp-client'
import { CodeEditorImpl } from './editor'
import {
  loadConfigurationService,
  loadDebugService,
  loadDialogService,
  loadEditorService,
  loadExtensionsService,
  loadFilesService,
  loadHostService,
  loadKeybindingsService,
  loadLanguagesService,
  loadLifecycleService,
  loadLogService,
  loadModelService,
  loadNotebookService,
  loadOutlineService,
  loadPreferencesService,
  loadQuickAccessService,
  loadRemoteAgentService,
  loadSearchService,
  loadStorageService,
  loadTaskService,
  loadTerminalService,
  loadTextmateService,
  loadThemeService,
  loadViewsService,
  loadWorkbenchService,
  type ServiceExport,
  type ServiceNames,
} from './service-loaders'

const LanguagePaths: Record<ComputeLanguageKind, string> = {
  JSON: 'json',
  PYTHON: 'pyright',
  C: 'c',
  CPP: 'cpp',
  GOLANG: 'go',
  JAVA: 'java',
  JAVASCRIPT: 'ts',
  RUST: 'rust',
  WASM: 'wasm',
}

const LanguageKinds: Record<string, ComputeLanguageKind> = {
  '.json': 'JSON',
  '.py': 'PYTHON',
  '.c': 'C',
  '.cpp': 'CPP',
  '.go': 'GOLANG',
  '.java': 'JAVA',
  '.ts': 'JAVASCRIPT',
  '.js': 'JAVASCRIPT',
  '.tsx': 'JAVASCRIPT',
  '.jsx': 'JAVASCRIPT',
  '.python': 'PYTHON',
  '.golang': 'GOLANG',
  '.rs': 'RUST',
  '>wasm': 'WASM',
}

class CodeEnvironmentImpl implements CodeEnvironment {
  private _config: VscodeApiConfig
  private _workerLoaders: Partial<Record<string, WorkerLoader>> = {}
  private _services: monaco.editor.IEditorOverrideServices
  private _serviceExports = new Map<string, Readonly<Record<string, any>>>()

  private _extensions: ExtensionConfig[] = []
  private _installedExtensions = new Map<string, RegisterExtensionResult>()
  private _extensionsStore?: DisposableStore = new DisposableStore()

  // all started language clients indexed by unique id.
  private _languageClients = new Map<string, LanguageClient>()

  public readonly logger: Logger

  constructor(
    public readonly context: UiContext,
    config: VscodeApiConfig,
    opt: CodeOptions,
  ) {
    this._config = config
    this._services = config.serviceOverrides ?? {}
    this.logger = new ConsoleLogger(opt.logLevel ?? LogLevel.Info)
  }

  private _getWorker(label: string) {
    const workerFactory = this._workerLoaders[label]
    if (workerFactory != null) {
      return workerFactory()
    }
    throw new Error(`Worker ${label} not found`)
  }

  private _addWorker(label: string, factory: () => Worker) {
    this._workerLoaders[label] = factory
  }

  private async _loadLocales() {
    const localeLoader: Record<string, () => Promise<void>> = {
      // cs: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-cs');
      // },
      // de: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-de');
      // },
      // es: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-es');
      // },
      // fr: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-fr');
      // },
      // it: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-it');
      // },
      // ja: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-ja');
      // },
      // ko: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-ko');
      // },
      // pl: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-pl');
      // },
      // 'pt-br': async () => {
      //     await import('@codingame/monaco-vscode-language-pack-pt-br');
      // },
      // 'qps-ploc': async () => {
      //     await import('@codingame/monaco-vscode-language-pack-qps-ploc');
      // },
      // ru: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-ru');
      // },
      // tr: async () => {
      //     await import('@codingame/monaco-vscode-language-pack-tr');
      // },
      'zh-hans': async () => {
        await import('@codingame/monaco-vscode-language-pack-zh-hans')
      },
      // 'zh-hant': async () => {
      //     await import('@codingame/monaco-vscode-language-pack-zh-hant');
      // }
    }
    for (const locale in localeLoader) {
      await localeLoader[locale]()
    }
  }

  public async addServices(name: ServiceNames, loader: () => Promise<any>, ...args: any[]) {
    const serviceExports = await loader()
    const { ...namedExports } = serviceExports
    this._serviceExports.set(name, namedExports)
    mergeServices(this._services, serviceExports.default(...(args ?? [])))
  }

  public updateUserConfiguration(config: Record<string, any>) {
    //  TODO: check this.
    this._services.updateUserConfiguration?.(JSON.stringify(config))
  }

  /**
   * Set the log-level via the development settings
   */
  public setDevLogLevel(logLevel: LogLevel) {
    const devLogLevel = this._config.workspaceConfig!.developmentOptions?.logLevel
    if (devLogLevel === undefined) {
      // this needs to be done so complicated, because developmentOptions is read-only
      const devOptions: Record<string, unknown> = {
        ...this._config.workspaceConfig!.developmentOptions,
      }
      devOptions.logLevel = logLevel
      // update config
      ;(this._config.workspaceConfig!.developmentOptions as Record<string, unknown>) = Object.assign({}, devOptions)
    } else if (devLogLevel !== logLevel) {
      throw new Error(
        `You have configured mismatching logLevels: ${logLevel} (wrapperConfig) ${devLogLevel} (workspaceConfig.developmentOptions)`,
      )
    }
  }

  /**
   * Enable semantic highlighting in the default configuration
   */
  public enableSemanticHighlighting() {
    const configDefaults: Record<string, unknown> = {
      ...this._config.workspaceConfig!.configurationDefaults,
    }
    configDefaults['editor.semanticHighlighting.enabled'] = true
    // update config
    ;(this._config.workspaceConfig!.configurationDefaults as Record<string, unknown>) = Object.assign(
      {},
      configDefaults,
    )
  }

  private _defaultOpenEditorStub(
    modelRef: IReference<any>,
    options: IEditorOptions | undefined,
    sideBySide?: boolean,
  ): Promise<ICodeEditor | undefined> {
    console.log('Received open editor call with parameters: ', modelRef, options, sideBySide)
    return Promise.resolve(undefined)
  }

  private _checkServiceConsistency(userServices?: monaco.editor.IEditorOverrideServices) {
    const haveThemeService = Object.keys(userServices ?? {}).includes('themeService')
    const haveTextmateService = Object.keys(userServices ?? {}).includes('textMateTokenizationFeature')
    const haveMarkersService = Object.keys(userServices ?? {}).includes('markersService')
    const haveViewsService = Object.keys(userServices ?? {}).includes('viewsService')

    // theme requires textmate
    if (haveThemeService && !haveTextmateService) {
      throw new Error('"theme" service requires "textmate" service. Please add it to the "userServices".')
    }

    // markers service requires views service
    if (haveMarkersService && !haveViewsService) {
      throw new Error('"markers" service requires "views" service. Please add it to the "userServices".')
    }

    // we end up here if no exceptions were thrown
    return true
  }

  public addExtention(config: IExtensionManifest, filesOrContents?: Map<string, string | URL>) {
    this._extensions.push({ config, filesOrContents })
  }

  public getExtension(extensionName: string) {
    return this._installedExtensions.get(extensionName)
  }

  public verifyUrlOrCreateDataUrl = (input: string | URL) => {
    return input instanceof URL ? input.href : new URL(`data:text/plain;base64,${btoa(input)}`).href
  }

  private async _initExtensions() {
    if (this._config?.loadThemes ?? true) {
      await import('@codingame/monaco-vscode-theme-defaults-default-extension')
    }

    const allPromises: Promise<void>[] = []
    const extensionIds: string[] = []
    getExtensionManifests().forEach(ext => {
      extensionIds.push(ext.identifier.id)
    })
    for (const extensionConfig of this._extensions ?? []) {
      if (!extensionIds.includes(`${extensionConfig.config.publisher}.${extensionConfig.config.name}`)) {
        const manifest = extensionConfig.config as IExtensionManifest
        const extRegResult = registerExtension(manifest, ExtensionHostKind.LocalProcess)
        this._installedExtensions.set(manifest.name, extRegResult)
        if (extensionConfig.filesOrContents && Object.hasOwn(extRegResult, 'registerFileUrl')) {
          for (const entry of extensionConfig.filesOrContents) {
            this._extensionsStore?.add(extRegResult.registerFileUrl(entry[0], this.verifyUrlOrCreateDataUrl(entry[1])))
          }
        }
        allPromises.push(extRegResult.whenReady())
      }
    }
    await Promise.all(allPromises)
  }
  private async _prepareClientConfig(
    id: string,
    kind: ComputeLanguageKind | string | undefined,
    options?: Partial<LanguageClientOptions>,
  ) {
    let lang: ComputeLanguageKind
    if (!kind) lang = 'JSON'
    else if (kind in LanguagePaths) lang = kind as ComputeLanguageKind
    else lang = LanguageKinds[kind] ?? ('JSON' as ComputeLanguageKind)
    const url = new URL(`${this.context.host.serviceEndpoints.language}/${LanguagePaths[lang]}`)
    url.searchParams.set('id', id)
    url.searchParams.set('session', this.context.id)
    const config: LanguageClientConfig = {
      clientOptions: { ...options },
      connection: {
        options: {
          $type: 'WebSocketUrl',
          url: url.toString(),
          startOptions: {
            onCall: () => {
              console.log('Connected to socket.')
            },
            reportStatus: true,
          },
          stopOptions: {
            onCall: () => {
              console.log('Disconnected from socket.')
            },
            reportStatus: true,
          },
        },
      },
    }
    switch (lang) {
      case 'JSON':
        await import('@codingame/monaco-vscode-json-default-extension')
        config.clientOptions.documentSelector = config.clientOptions.documentSelector ?? ['json']
        break
      case 'PYTHON':
        await import('@codingame/monaco-vscode-python-default-extension')
        config.clientOptions.documentSelector = config.clientOptions.documentSelector ?? ['python', 'py']
        break
      default:
      // TODO: handle more languages
    }
    return config
  }

  private _getServiceExports(name: string): any {
    const serviceExports = this._serviceExports.get(name)
    if (!serviceExports) throw new Error(`${name} service not loaded.`)
    return serviceExports
  }

  public getServiceUtilities<T extends ServiceNames>(name: T): ServiceExport<T> {
    return this._getServiceExports(name)
  }

  public async startLanguageClient(id: string, kind?: ComputeLanguageKind | string, options?: LanguageClientOptions) {
    let client = this._languageClients.get(id)
    if (!client) {
      const config = await this._prepareClientConfig(id, kind, options)
      client = new LanguageClient(this, id, config)
      this._languageClients.set(id, client)
    }
    await client.start()
  }

  public async stopLanguageClient(id: string) {
    const client = this._languageClients.get(id)
    if (client) {
      await client.stop()
      this._languageClients.delete(id)
    }
  }

  private _editors = new Map<string, CodeEditor>()

  public async createEditor(id: string, container: HTMLElement, opt: CodeEditorOptions) {
    let editor = this._editors.get(id)
    if (!editor) {
      editor = new CodeEditorImpl(this, id, opt)
    }
    await editor.start(container)
    return editor
  }

  public async disposeEditor(id: string) {
    const editor = this._editors.get(id)
    if (editor) {
      await editor.stop()
      this._editors.delete(id)
    }
  }

  /* eslint-enabled @typescript-eslint/naming-convention */
  public async init(progress?: (progress: WorkerProgress) => void) {
    // use get worker as a signal that the env is initialized
    if (window.MonacoEnvironment?.getWorker) return

    // await this._loadLocales()
    progress?.({ progress: 0.1, message: '本地化加载完成' })

    this._addWorker(
      'TextEditorWorker',
      () => new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url), { type: 'module' }),
    )
    this._addWorker(
      'TextMateWorker',
      () =>
        new Worker(new URL('@codingame/monaco-vscode-textmate-service-override/worker', import.meta.url), {
          type: 'module',
        }),
    )

    // the following services are included by default, but need loaded manually

    await this.addServices('configuration', loadConfigurationService)
    await this.addServices('host', loadHostService)
    await this.addServices('theme', loadThemeService)
    await this.addServices('keybindings', loadKeybindingsService)
    await this.addServices('storage', loadStorageService)
    await this.addServices('lifecycle', loadLifecycleService)

    await this.addServices('extensions', loadExtensionsService)
    await this.addServices('files', loadFilesService)
    await this.addServices('quickaccess', loadQuickAccessService)

    await this.addServices('languages', loadLanguagesService)
    await this.addServices('textmate', loadTextmateService)
    await this.addServices('model', loadModelService)
    await this.addServices('log', loadLogService)
    await this.addServices('dialog', loadDialogService)
    await this.addServices('preferences', loadPreferencesService)
    await this.addServices('remoteAgent', loadRemoteAgentService)
    await this.addServices('notebook', loadNotebookService)
    await this.addServices('terminal', loadTerminalService)
    await this.addServices('search', loadSearchService)
    await this.addServices('task', loadTaskService)
    await this.addServices('outline', loadOutlineService)
    await this.addServices('debug', loadDebugService)
    // await this.addServices('scm', loadScmService)
    // await this.addServices('chat', loadChatService)

    const vc = this._config.viewsConfig
    const vt = vc?.viewServiceType
    if (vt === 'ViewsService') {
      await this.addServices('views', loadViewsService)
    } else if (vt === 'WorkspaceService') {
      await this.addServices('workbench', loadWorkbenchService)
    } else {
      await this.addServices('editor', loadEditorService)
    }

    this._config.serviceOverrides = this._services
    progress?.({ progress: 0.4, message: '服务加载完成' })

    if (this._config.workspaceConfig === undefined) {
      this._config.workspaceConfig = {
        workspaceProvider: {
          trusted: true,
          workspace: {
            workspaceUri: vscode.Uri.file('/workspace.code-workspace'),
          },
          open: () => {
            // TODO: check this.
            window.open(window.location.href)
            return Promise.resolve(true)
          },
        },
      }
    }
    this.enableSemanticHighlighting()

    const success = await initServices(this._config, {
      // htmlContainer: htmlContainer,
      caller: `platform`,
      performServiceConsistencyChecks: this._checkServiceConsistency.bind(this),
      logger: this.logger,
    })
    if (!success) throw new Error('Initialize services failed.')
    progress?.({ progress: 0.2, message: '服务加载完成' })
    // progress?.(80, '服务初始化完成')

    // initialize extensions.
    await this._initExtensions()

    progress?.({ progress: 0.3, message: '插件初始化完成' })

    // // start language client.
    // await Promise.allSettled(Array.from(this._languageClients.values()).map(lsc => lsc.start()))

    // progress?.(95, '语言服务加载完成')

    window.MonacoEnvironment = {
      getWorker: (_, label) => this._getWorker(label),
    }
  }

  public async dispose() {
    // stop all language clients
    await Promise.allSettled(Array.from(this._languageClients.values()).map(lsc => lsc.stop(true)))
    // stop all extensions
    await Promise.allSettled(Array.from(this._installedExtensions.values()).map(k => k.dispose()))
    this._extensionsStore?.dispose()
    // re-create disposable stores
    this._extensionsStore = new DisposableStore()
  }
}

export const createEnvironment = (context: UiContext, config: VscodeApiConfig, opt: CodeOptions) => {
  return new CodeEnvironmentImpl(context, config, opt)
}
