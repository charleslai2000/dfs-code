import type EventEmitter from 'events'
import type { ITextFileEditorModel } from '@codingame/monaco-vscode-api/monaco'
import type { IReference } from '@codingame/monaco-vscode-api/vscode/vs/base/common/lifecycle'
import type { ITextModel } from '@codingame/monaco-vscode-api/vscode/vs/editor/common/model'
import type { MessageTransports, LanguageClientOptions } from 'vscode-languageclient/browser.js'
import type { ConnectionConfigOptions } from 'monaco-languageclient'
import type { ContextProperty, UiContext, WorkerProgress } from '@nexp/front-lib/platform'
import type {
  IStandaloneCodeEditor,
  IStandaloneEditorConstructionOptions,
} from '@codingame/monaco-vscode-api/vscode/vs/editor/standalone/browser/standaloneCodeEditor'
import type { IExtensionManifest } from '@codingame/monaco-vscode-api/extensions'
import type { Logger } from 'monaco-languageclient/tools'

export interface CodeEnvironmentProp extends ContextProperty {
  name: 'service.code'
  environment: CodeEnvironment
}

export type WorkerLoader = () => Worker

export interface ManagedService {
  readonly isRunning: boolean
  start(): Promise<void>
  stop(): Promise<void>
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
export interface LanguageClientConfig {
  name?: string
  connection: ConnectionConfig
  clientOptions: LanguageClientOptions
  restartOptions?: LanguageClientRestartOptions
}

export interface LanguageClientError {
  message: string
  error: Error | string
}

export interface CodeOptions {
  logLevel?: number
}

export interface CodeEnvironment {
  context: UiContext
  init(progress?: (progress: WorkerProgress) => void): Promise<void>
  startLanguageClient(id: string, config: LanguageClientConfig): Promise<void>
  stopLanguageClient(id: string): Promise<void>
  dispose(): Promise<void>
}

export interface CodeEditorOptions {
  content?: CodeContent
  domReadOnly?: boolean
  readOnly?: boolean
  overrideAutomaticLayout?: boolean
  editorOptions?: IStandaloneEditorConstructionOptions
  workerFactory?: (logger?: Logger) => void
}

export interface EditorEnvironmentEvents {
  modelChange: [ITextModel]
  textChange: [string]
}

export interface EditorEnvironment extends EventEmitter<EditorEnvironmentEvents> {
  editor?: IStandaloneCodeEditor
  modelRef?: IReference<ITextFileEditorModel>
  textModel?: ITextModel | null
  textContent?: string
  createEditor(htmlContainer: HTMLElement): Promise<void>
  updateContent(content?: CodeContent): Promise<void>
  dispose(): void
}

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

export interface CodeContent {
  text: string
  uri: string
  enforceLanguageId?: string
}

export interface CodeResources {
  modified?: CodeContent
  original?: CodeContent
}
