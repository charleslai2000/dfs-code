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
import type { UiContext } from '@nexp/front-lib/platform'
import type { CodeEnvironment, CodeOptions, ExtensionConfig, WorkerLoader } from './types'
import { LanguageClient } from './lsp-client'

class CodeEnvironmentImpl implements CodeEnvironment {
  private _config: VscodeApiConfig
  private _workerLoaders: Partial<Record<string, WorkerLoader>> = {}
  private _services: monaco.editor.IEditorOverrideServices

  private _extensions: ExtensionConfig[] = []
  private _installedExtensions = new Map<string, RegisterExtensionResult>()
  private _extensionsStore?: DisposableStore = new DisposableStore()

  private _languageClients = new Map<string, LanguageClient>()

  public readonly logger: Logger

  constructor(
    public readonly context: UiContext,
    config: VscodeApiConfig,
    opt: CodeOptions,
  ) {
    this._config = config
    this._services = config.serviceOverrides ?? {}
    if (opt.languageClients) {
      Object.entries(opt.languageClients).forEach(([name, config]) => {
        const client = new LanguageClient(this, config)
        this._languageClients.set(name, client)
      })
    }
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

  public async addServices(loader: () => Promise<any>, ...args: any[]) {
    const override = (await loader()).default
    mergeServices(this._services, override(...(args ?? [])))
  }

  public updateUserConfiguration(config: Record<string, any>) {
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

  /* eslint-enabled @typescript-eslint/naming-convention */
  public async init(progress?: (progress: number, message?: string, error?: string) => void) {
    // use get worker as a signal that the env is initialized
    if (window.MonacoEnvironment?.getWorker) return

    // await this._loadLocales()
    progress?.(60, '本地化加载完成')

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

    // the following services are included by default
    // await this.addServices(() => import('@codingame/monaco-vscode-host-service-override'))
    // await this.addServices(() => import('@codingame/monaco-vscode-quickaccess-service-override'))
    // await this.addServices(() => import('@codingame/monaco-vscode-extensions-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-configuration-service-override'))
    // Enable language support and trigger onLanguage events
    await this.addServices(() => import('@codingame/monaco-vscode-languages-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-textmate-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-theme-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-keybindings-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-files-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-storage-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-lifecycle-service-override'))
    // enables vscode notifications you usually find in the bottom right corner
    // @codingame/monaco-vscode-notifications-service-override
    await this.addServices(() => import('@codingame/monaco-vscode-dialogs-service-override'))
    // creates and takes care of model references.
    await this.addServices(() => import('@codingame/monaco-vscode-model-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-preferences-service-override'))

    await this.addServices(() => import('@codingame/monaco-vscode-remote-agent-service-override'))
    // await this.addServices(() => import('@codingame/monaco-vscode-chat-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-notebook-service-override'))

    // when views and workbench services are used:
    await this.addServices(() => import('@codingame/monaco-vscode-debug-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-terminal-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-search-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-scm-service-override'))
    // task management
    await this.addServices(() => import('@codingame/monaco-vscode-task-service-override'))
    await this.addServices(() => import('@codingame/monaco-vscode-outline-service-override'))

    this.context.log.i('4 services loaded.')

    const vc = this._config.viewsConfig
    const vt = vc?.viewServiceType
    if (vt === 'ViewsService') {
      await this.addServices(
        () => import('@codingame/monaco-vscode-views-service-override'),
        vc?.openEditorFunc ?? this._defaultOpenEditorStub.bind(this),
      )
    } else if (vt === 'WorkspaceService') {
      await this.addServices(() => import('@codingame/monaco-vscode-workbench-service-override'))
    } else {
      await this.addServices(() => import('@codingame/monaco-vscode-editor-service-override'))
    }
    this._config.serviceOverrides = this._services
    progress?.(70, '核心服务加载完成')

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
    progress?.(80, '服务初始化完成')

    // initialize extensions.
    await this._initExtensions()

    progress?.(95, '插件初始化完成')

    // start language client.
    await Promise.allSettled(Array.from(this._languageClients.values()).map(lsc => lsc.start()))

    progress?.(95, '语言服务加载完成')

    window.MonacoEnvironment = {
      getWorker: (_, label) => this._getWorker(label),
    }
  }

  public async dispose() {
    // stop all language clients
    await Promise.allSettled(Array.from(this._languageClients.values()).map(lsc => lsc.dispose()))
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
