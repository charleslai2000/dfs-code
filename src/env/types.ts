import type EventEmitter from 'events'
import type * as vscode from 'vscode'
import type { ITextFileEditorModel } from '@codingame/monaco-vscode-api/monaco'
import type { IReference } from '@codingame/monaco-vscode-api/vscode/vs/base/common/lifecycle'
import type { ITextModel } from '@codingame/monaco-vscode-api/vscode/vs/editor/common/model'
import type { MessageTransports, LanguageClientOptions } from 'vscode-languageclient/browser'
import type { ConnectionConfigOptions } from 'monaco-languageclient'
import type { ContextProperty, UiContext, WorkerProgress } from '@nexp/front-lib/platform'
import type {
  IStandaloneCodeEditor,
  IStandaloneEditorConstructionOptions,
} from '@codingame/monaco-vscode-api/vscode/vs/editor/standalone/browser/standaloneCodeEditor'
import type {
  IExtensionManifest,
  RegisterExtensionParams,
  RegisterLocalProcessExtensionResult,
} from '@codingame/monaco-vscode-api/extensions'
import type { Logger } from 'monaco-languageclient/tools'
import type { ServiceIdentifier } from '@codingame/monaco-vscode-api/vscode/vs/platform/instantiation/common/instantiation'
import type { ViewsConfig } from 'monaco-languageclient/vscode/services'
import type { IEditorOverrideServices } from '@codingame/monaco-vscode-api'
import type { ServiceExport, ServiceNames } from './service-loaders'

export enum LogLevel {
  /* eslint-disable @typescript-eslint/naming-convention */
  Off = 0,
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warning = 4,
  Error = 5,
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface CodeEnvironmentProp extends ContextProperty {
  name: 'service.code'
  environment: CodeEnvironment
}

export type WorkerLoader = () => Worker

export interface ServiceEvents<T> {
  started: [T]
  stopped: [T]
}

export interface ManagedService<T extends ManagedService<T, E>, E extends ServiceEvents<T> = ServiceEvents<T>>
  // @ts-expect-error inner code error.
  extends EventEmitter<E> {
  readonly isRunning: boolean
  start(...args: any[]): Promise<void>
  stop(...args: any[]): Promise<void>
}

export interface ExtensionConfig {
  config: IExtensionManifest
  filesOrContents?: Map<string, string | URL>
}

export interface ConnectionConfig {
  options: ConnectionConfigOptions
  messageTransports?: MessageTransports
}

export interface LanguageClientRestartOptions {
  retries: number
  timeout: number
  keepWorker?: boolean
}

export interface LanguageClientError {
  message: string
  error: Error | string
}

export interface CodeConfiguration {
  loadThemes?: boolean
  serviceOverrides?: IEditorOverrideServices
  userConfiguration?: Record<string, any>
  viewsConfig?: ViewsConfig
  logLevel?: LogLevel
}

export type ComputeLanguageKind =
  /** Json */
  | 'JSON'
  /** WebAssembly */
  | 'WASM'
  /** Python */
  | 'PYTHON'
  /** JavaScript */
  | 'JAVASCRIPT'
  /** Java */
  | 'JAVA'
  /** Go语言 */
  | 'GOLANG'
  /** Rust */
  | 'RUST'
  /** C++ */
  | 'CPP'
  /** C语言 */
  | 'C'

export interface CodeEnvironment {
  context: UiContext
  api: typeof vscode
  init(progress?: (progress: WorkerProgress) => void): Promise<void>
  startLanguageClient(
    id: string,
    kind?: ComputeLanguageKind | string,
    options?: Partial<LanguageClientOptions>,
  ): Promise<void>
  stopLanguageClient(id: string): Promise<void>
  createEditor(id: string, html: HTMLElement, opt: CodeEditorOptions): Promise<CodeEditor>
  getServiceApi<T extends ServiceNames>(name: T): ServiceExport<T>
  getService<T>(identifier: ServiceIdentifier<T>): Promise<T>
  registerExtension(manifest: IExtensionManifest, params?: RegisterExtensionParams): RegisterLocalProcessExtensionResult
  disposeEditor(id: string): Promise<void>
  dispose(): Promise<void>
}

export { IStandaloneEditorConstructionOptions as StandaloneEditorOptions }

export interface CodeContent {
  text: string
  uri: string
  enforceLanguageId?: string
}

export interface CodeEditorOptions {
  content: CodeContent
  // domReadOnly?: boolean
  // readOnly?: boolean
  // overrideAutomaticLayout?: boolean
  editorOptions?: IStandaloneEditorConstructionOptions
  workerFactory?: (logger?: Logger) => void
  logLevel?: LogLevel
}

export type CodeEditorEvents<T> = ServiceEvents<T> & {
  modelChange: [ITextModel]
  textChange: [string]
}

export interface CodeEditor extends ManagedService<CodeEditor, CodeEditorEvents<CodeEditor>> {
  editor?: IStandaloneCodeEditor
  modelRef?: IReference<ITextFileEditorModel>
  textModel?: ITextModel | null
  textContent?: string
  createEditor(htmlContainer: HTMLElement): Promise<void>
  updateContent(content?: CodeContent): Promise<void>
}

// TODO: check the following used by diff editor.
export interface ModelRefs {
  modelRefModified?: IReference<ITextFileEditorModel>
  modelRefOriginal?: IReference<ITextFileEditorModel>
}

export interface TextModels {
  modified?: ITextModel
  original?: ITextModel
}

export interface TextContents {
  modified?: string
  original?: string
}

export interface CodeResources {
  modified?: CodeContent
  original?: CodeContent
}
