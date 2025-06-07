import * as vscode from 'vscode'
import { registerExtension, ExtensionHostKind, getExtensionManifests } from '@codingame/monaco-vscode-api/extensions'
// eslint-disable-next-line import/order
import * as monaco from '@codingame/monaco-vscode-editor-api'

import type { IEditorOptions } from '@codingame/monaco-vscode-api'
import { getService, LogLevel } from '@codingame/monaco-vscode-api'
import type { VscodeApiConfig } from 'monaco-languageclient/vscode/services'
import { initServices, mergeServices } from 'monaco-languageclient/vscode/services'
import type { IReference } from '@codingame/monaco-vscode-api/monaco'
import { DisposableStore, setUnexpectedErrorHandler } from '@codingame/monaco-vscode-api/monaco'
import type { Logger } from 'monaco-languageclient/tools'
import { ConsoleLogger } from 'monaco-languageclient/tools'
import type {
  RegisterExtensionResult,
  IExtensionManifest,
  RegisterExtensionParams,
  RegisterLocalProcessExtensionResult,
} from '@codingame/monaco-vscode-api/extensions'
import type { UiContext, WorkerProgress } from '@nexp/front-lib/platform'
import type { LanguageClientOptions } from 'vscode-languageclient/browser'
import { type IResolvedTextEditorModel } from '@codingame/monaco-vscode-views-service-override'
import type { ICodeEditor } from '@codingame/monaco-vscode-api/vscode/vs/editor/browser/editorBrowser'
import type { ServiceIdentifier } from '@codingame/monaco-vscode-api/vscode/vs/platform/instantiation/common/instantiation'
import { type IStoredWorkspace } from '@codingame/monaco-vscode-configuration-service-override'
import { assert } from '@nexp/front-lib/utility'
import { TerminalBackend } from '../features/terminal'
import type {
  CodeConfiguration,
  CodeEditor,
  CodeEditorOptions,
  CodeEnvironment,
  ComputeLanguageKind,
  ExtensionConfig,
  WorkerLoader,
} from './types'
import type { LanguageClientConfig } from './lsp-client'
import { LanguageClient } from './lsp-client'
import { CodeEditorImpl } from './editor'
import type { AllServiceNames, ParametersOf, ServiceExport, ServiceNames } from './service-loaders'
import {
  loadBannerService,
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
  loadLocalizationService,
  loadLogService,
  loadModelService,
  loadNotebookService,
  loadOutlineService,
  loadPreferencesService,
  loadQuickAccessService,
  loadRemoteAgentService,
  loadSearchService,
  loadStatusBarService,
  loadStorageService,
  loadTaskService,
  loadTerminalService,
  loadTextmateService,
  loadThemeService,
  loadTitleBarService,
  loadViewsService,
  loadWorkbenchService,
} from './service-loaders'
import { constructOptions } from './setup.common'
import userConfig from './configuration.json'

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
    config: CodeConfiguration,
  ) {
    const { logLevel, ...rest } = config
    this._config = { ...rest }
    const userConfiguration = { ...userConfig, ...config.userConfiguration }
    this._config.userConfiguration = { json: JSON.stringify(userConfiguration, undefined, 2) }
    this._services = { ...config.serviceOverrides }
    this.logger = new ConsoleLogger(logLevel ?? LogLevel.Info)
  }

  private _getWorker(moduleId: string, label: string) {
    const workerFactory = this._workerLoaders[label]
    if (workerFactory != null) {
      return workerFactory()
    }
    throw new Error(`Unimplemented worker ${label} (${moduleId})`)
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
      // 'zh-hans': async () => {
      //   await import('@codingame/monaco-vscode-language-pack-zh-hans')
      // },
      // 'zh-hant': async () => {
      //     await import('@codingame/monaco-vscode-language-pack-zh-hant');
      // }
    }
    for (const locale in localeLoader) {
      await localeLoader[locale]()
    }
  }

  public async loadServices<T extends AllServiceNames>(name: T, loader: () => Promise<any>, ...args: ParametersOf<T>) {
    const serviceExports = await loader()
    // remove "default" in service exports.
    const { default: _default, ...namedExports } = serviceExports
    this._serviceExports.set(name, namedExports)
    mergeServices(this._services, _default(...(args ?? [])))
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

  public getServiceApi<T extends ServiceNames>(name: T): ServiceExport<T> {
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

  // TODO: check this.
  private _currentEditor: any
  private _openNewCodeEditor(
    modelRef: IReference<IResolvedTextEditorModel>,
    options: IEditorOptions | undefined,
    sideBySide?: boolean,
  ): Promise<ICodeEditor | undefined> {
    if (this._currentEditor != null) {
      this._currentEditor.dispose()
      this._currentEditor = null
    }
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    container.style.top = container.style.bottom = container.style.left = container.style.right = '0'
    container.style.cursor = 'pointer'

    const editorElem = document.createElement('div')
    editorElem.style.position = 'absolute'
    editorElem.style.top = editorElem.style.bottom = editorElem.style.left = editorElem.style.right = '0'
    editorElem.style.margin = 'auto'
    editorElem.style.width = '80%'
    editorElem.style.height = '80%'

    container.appendChild(editorElem)

    document.body.appendChild(container)
    try {
      const editor = monaco.editor.create(editorElem, {
        model: modelRef.object.textEditorModel,
        readOnly: true,
        automaticLayout: true,
      })

      this._currentEditor = {
        dispose: () => {
          editor.dispose()
          modelRef.dispose()
          document.body.removeChild(container)
          this._currentEditor = null
        },
        modelRef,
        editor,
      }

      editor.onDidBlurEditorWidget(() => {
        this._currentEditor?.dispose()
      })
      container.addEventListener('mousedown', event => {
        if (event.target !== container) {
          return
        }

        this._currentEditor?.dispose()
      })
      return Promise.resolve(editor)
    } catch (error) {
      document.body.removeChild(container)
      this._currentEditor = null
      throw error
    }
  }

  public getService<T>(identifier: ServiceIdentifier<T>): Promise<T> {
    return getService(identifier)
  }
  // registerExtension(manifest: IExtensionManifest, extHostKind: ExtensionHostKind.LocalProcess, params?: RegisterExtensionParams): RegisterLocalProcessExtensionResult;
  // registerExtension(manifest: IExtensionManifest, extHostKind: ExtensionHostKind.LocalWebWorker, params?: RegisterExtensionParams): RegisterLocalExtensionResult;
  // registerExtension(manifest: IExtensionManifest, extHostKind: ExtensionHostKind.Remote, params?: RegisterRemoteExtensionParams): RegisterRemoteExtensionResult;
  // registerExtension(manifest: IExtensionManifest, extHostKind?: ExtensionHostKind, params?: RegisterExtensionParams): RegisterExtensionResult;
  public registerExtension(
    manifest: IExtensionManifest,
    params?: RegisterExtensionParams,
  ): RegisterLocalProcessExtensionResult {
    return registerExtension(manifest, ExtensionHostKind.LocalProcess, params)
  }

  private async _setupFiles() {
    const workspaceFile = monaco.Uri.file('/workspace.code-workspace')
    const {
      createIndexedDBProviders,
      registerFileSystemOverlay,
      RegisteredMemoryFile,
      RegisteredFileSystemProvider,
      RegisteredReadOnlyFile,
    } = this.getServiceApi('files')
    const userDataProvider = await createIndexedDBProviders()

    const fileSystemProvider = new RegisteredFileSystemProvider(false)
    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        vscode.Uri.file('/workspace/test.js'),
        `// import anotherfile
let variable = 1
function inc () {
  variable++
}

while (variable < 5000) {
  inc()
  console.log('Hello world', variable);
}`,
      ),
    )

    const content = new TextEncoder().encode('This is a readonly static file')
    fileSystemProvider.registerFile(
      new RegisteredReadOnlyFile(vscode.Uri.file('/workspace/test_readonly.js'), async () => content, content.length),
    )

    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        vscode.Uri.file('/workspace/jsconfig.json'),
        `{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "lib": [
      "es2021",
      "DOM"
    ]
  }
}`,
      ),
    )

    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        vscode.Uri.file('/workspace/index.html'),
        `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>monaco-vscode-api demo</title>
    <link rel="stylesheet" href="test.css">
  </head>
  <body>
    <style type="text/css">
      h1 {
        color: DeepSkyBlue;
      }
    </style>

    <h1>Hello, world!</h1>
  </body>
</html>`,
      ),
    )

    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        vscode.Uri.file('/workspace/test.md'),
        `
***Hello World***

Math block:
$$
\\displaystyle
\\left( \\sum_{k=1}^n a_k b_k \\right)^2
\\leq
\\left( \\sum_{k=1}^n a_k^2 \\right)
\\left( \\sum_{k=1}^n b_k^2 \\right)
$$

# Easy Math

2 + 2 = 4 // this test will pass
2 + 2 = 5 // this test will fail

# Harder Math

230230 + 5819123 = 6049353
`,
      ),
    )

    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        vscode.Uri.file('/workspace/test.customeditor'),
        `
Custom Editor!`,
      ),
    )

    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        vscode.Uri.file('/workspace/test.css'),
        `
h1 {
  color: DeepSkyBlue;
}`,
      ),
    )

    // Use a workspace file to be able to add another folder later (for the "Attach filesystem" button)
    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        workspaceFile,
        JSON.stringify(
          {
            folders: [
              {
                path: '/workspace',
              },
            ],
          } as IStoredWorkspace,
          null,
          2,
        ),
      ),
    )

    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        monaco.Uri.file('/workspace/.vscode/extensions.json'),
        JSON.stringify(
          {
            recommendations: ['vscodevim.vim'],
          },
          null,
          2,
        ),
      ),
    )

    registerFileSystemOverlay(1, fileSystemProvider)
  }

  /* eslint-enabled @typescript-eslint/naming-convention */
  public async init(progress?: (progress: WorkerProgress) => void) {
    // use get worker as a signal that the env is initialized
    if (window.MonacoEnvironment?.getWorker) return
    // load locals
    // TODO: Some parts of VSCode are already initialized, make sure the language pack is loaded before anything else or some translations will be missing
    await this._loadLocales()
    progress?.({ progress: 0.1, message: '本地化加载完成' })
    this._addWorker(
      'TextEditorWorker',
      () =>
        new Worker(new URL('@codingame/monaco-vscode-editor-api/esm/vs/editor/editor.worker', import.meta.url), {
          type: 'module',
        }),
    )
    this._addWorker(
      'TextMateWorker',
      () =>
        new Worker(new URL('@codingame/monaco-vscode-textmate-service-override/worker', import.meta.url), {
          type: 'module',
        }),
    )
    // OutputLinkDetectionWorker: () =>
    //   new Worker(new URL('@codingame/monaco-vscode-output-service-override/worker', import.meta.url), { type: 'module' }),
    // LanguageDetectionWorker: () =>
    //   new Worker(new URL('@codingame/monaco-vscode-language-detection-worker-service-override/worker', import.meta.url), {
    //     type: 'module',
    //   }),
    // NotebookEditorWorker: () =>
    //   new Worker(new URL('@codingame/monaco-vscode-notebook-service-override/worker', import.meta.url), {
    //     type: 'module',
    //   }),
    // LocalFileSearchWorker: () =>
    //   new Worker(new URL('@codingame/monaco-vscode-search-service-override/worker', import.meta.url), { type: 'module' }),
    // the following services are included by default, but need loaded manually
    window.MonacoEnvironment = {
      getWorker: (moduleId, labelId) => this._getWorker(moduleId, labelId),
    }

    await this.loadServices('configuration', loadConfigurationService)

    await this.loadServices('host', loadHostService)
    await this.loadServices('theme', loadThemeService)
    await this.loadServices('keybindings', loadKeybindingsService)
    await this.loadServices('storage', loadStorageService, {
      fallbackOverride: {
        'workbench.activity.showAccounts': false,
      },
    })
    await this.loadServices('lifecycle', loadLifecycleService)

    await this.loadServices('extensions', loadExtensionsService)
    await this.loadServices('files', loadFilesService)

    await this.loadServices('languages', loadLanguagesService)
    await this.loadServices('textmate', loadTextmateService)
    await this.loadServices('model', loadModelService)
    await this.loadServices('log', loadLogService)
    await this.loadServices('dialog', loadDialogService)
    await this.loadServices('preferences', loadPreferencesService)
    await this.loadServices('remoteAgent', loadRemoteAgentService, { scanRemoteExtensions: true })
    await this.loadServices('notebook', loadNotebookService)
    await this.loadServices('terminal', loadTerminalService, new TerminalBackend())
    await this.loadServices('search', loadSearchService)
    await this.loadServices('task', loadTaskService)
    await this.loadServices('outline', loadOutlineService)
    await this.loadServices('debug', loadDebugService)
    await this.loadServices('banner', loadBannerService)
    await this.loadServices('statusBar', loadStatusBarService)
    await this.loadServices('titleBar', loadTitleBarService)
    //   getBannerServiceOverride(),
    // ...getStatusBarServiceOverride(),
    // ...getTitleBarServiceOverride(),
    await this.loadServices('localization', loadLocalizationService, {
      clearLocale() {
        const url = new URL(window.location.href)
        url.searchParams.delete('locale')
        window.history.pushState(null, '', url.toString())
        return Promise.resolve()
      },
      setLocale(id: any) {
        const url = new URL(window.location.href)
        url.searchParams.set('locale', id)
        window.history.pushState(null, '', url.toString())
        return Promise.resolve()
      },
      availableLanguages: [
        { locale: 'en', languageName: 'English' },
        { locale: 'zh-hans', languageName: 'Chinese (Simplified)' },
      ],
    })
    // await this.addServices('scm', loadScmService)
    // await this.addServices('chat', loadChatService)

    const vc = this._config.viewsConfig
    const vt = vc?.viewServiceType
    if (vt === 'ViewsService') {
      await this.loadServices('views', loadViewsService, this._openNewCodeEditor.bind(this))
    } else if (vt === 'WorkspaceService') {
      await this.loadServices('workbench', loadWorkbenchService)
    } else {
      await this.loadServices('editor', loadEditorService, this._openNewCodeEditor.bind(this))
    }

    const { isEditorPartVisible } = this.getServiceApi('views')
    await this.loadServices('quickaccess', loadQuickAccessService, {
      isKeybindingConfigurationVisible: isEditorPartVisible,
      shouldUseGlobalPicker: (_, isStandalone) => !isStandalone && isEditorPartVisible(),
    })

    this._config.serviceOverrides = this._services
    progress?.({ progress: 0.4, message: '服务加载完成' })

    this._config.workspaceConfig = constructOptions
    this._config.envOptions = {
      // Otherwise, VSCode detect it as the first open workspace folder
      // which make the search result extension fail as it's not able to know what was detected by VSCode
      // TODO check this.
      // userHome: vscode.Uri.file('/')
    }
    this.enableSemanticHighlighting()

    await this._setupFiles()
    const sorted = Object.keys(this._config.serviceOverrides).sort((a, b) => a.localeCompare(b))
    const success = await initServices(this._config, {
      htmlContainer: document.body,
      caller: `platform`,
      performServiceConsistencyChecks: this._checkServiceConsistency.bind(this),
      logger: this.logger,
    })
    if (!success) throw new Error('Initialize services failed.')

    const { updateUserConfiguration } = this.getServiceApi('configuration')
    if (this._config.userConfiguration?.json) await updateUserConfiguration(this._config.userConfiguration.json)
    setUnexpectedErrorHandler(e => {
      console.info('Unexpected error', e)
    })

    progress?.({ progress: 0.2, message: '服务加载完成' })
    // progress?.(80, '服务初始化完成')

    // initialize extensions.
    await this._initExtensions()

    await this._testSetup(document.body)
    progress?.({ progress: 0.3, message: '插件初始化完成' })

    // // start language client.
    // await Promise.allSettled(Array.from(this._languageClients.values()).map(lsc => lsc.start()))

    // progress?.(95, '语言服务加载完成')
  }

  // private _api?: typeof vscode
  private async _testSetup(root: HTMLElement) {
    // TODO: dispose
    const { getApi, setAsDefaultApi } = registerExtension(
      {
        name: 'demo',
        publisher: 'codingame',
        version: '1.0.0',
        engines: {
          vscode: '*',
        },
      },
      ExtensionHostKind.LocalProcess,
    )

    const globalEnv = window.MonacoEnvironment as any
    globalEnv.__api = await getApi()
    await setAsDefaultApi()
    // .setAsDefaultApi()
  }

  public get api() {
    const globalEnv = window.MonacoEnvironment as any
    const api = globalEnv.__api
    assert(api, 'VSCode API not initialized')
    return api
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

export const createEnvironment = (context: UiContext, config: VscodeApiConfig) => {
  return new CodeEnvironmentImpl(context, config)
}
