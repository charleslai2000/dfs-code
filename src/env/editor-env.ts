import EventEmitter from 'events'
import * as vscode from 'vscode'
import * as monaco from '@codingame/monaco-vscode-editor-api'
import type { ITextFileEditorModel } from '@codingame/monaco-vscode-api/monaco'
import { createModelReference } from '@codingame/monaco-vscode-api/monaco'
import type { IReference } from '@codingame/monaco-vscode-editor-service-override'
import type { Logger } from 'monaco-languageclient/tools'
import { ConsoleLogger } from 'monaco-languageclient/tools'
import { ConfigurationTarget, IConfigurationService, StandaloneServices } from '@codingame/monaco-vscode-api'
import type { ITextModel } from '@codingame/monaco-vscode-api/vscode/vs/editor/common/model'
import type {
  CodeContent,
  CodeEditorOptions,
  CodeEnvironment,
  EditorEnvironment,
  EditorEnvironmentEvents,
} from './types'

export class EditorEnvImpl extends EventEmitter<EditorEnvironmentEvents> implements EditorEnvironment {
  protected logger: Logger
  private _editor?: monaco.editor.IStandaloneCodeEditor
  private _refModel?: IReference<ITextFileEditorModel>

  content?: CodeContent
  domReadOnly?: boolean
  readOnly?: boolean
  overrideAutomaticLayout?: boolean
  editorOptions?: monaco.editor.IStandaloneEditorConstructionOptions
  workerFactory?: (logger?: Logger) => void

  constructor(
    public readonly env: CodeEnvironment,
    public readonly id: string,
    opt?: CodeEditorOptions,
    logger?: Logger,
  ) {
    super()
    this.logger = logger ?? new ConsoleLogger()
    this.content = opt?.content
    this.domReadOnly = opt?.domReadOnly ?? false
    this.readOnly = opt?.readOnly ?? false
    this.overrideAutomaticLayout = opt?.overrideAutomaticLayout ?? true
    this.editorOptions = {
      ...opt?.editorOptions,
      automaticLayout: opt?.overrideAutomaticLayout ?? true,
    }
    if (this.editorOptions['semanticHighlighting.enabled'] !== undefined) {
      StandaloneServices.get(IConfigurationService)
        .updateValue(
          'editor.semanticHighlighting.enabled',
          this.editorOptions?.['semanticHighlighting.enabled'],
          ConfigurationTarget.USER,
        )
        .catch(e => this.logger.error(e))
    }
    this.on('modelChange', (textModel: ITextModel) => {
      textModel.onDidChangeContent(() => {
        if (this.eventNames().includes('textChange')) {
          this.emit('textChange', textModel.getValue())
        }
      })
    })
  }

  public get editor() {
    return this._editor
  }

  public get modelRef(): IReference<ITextFileEditorModel> | undefined {
    return this._refModel
  }

  public get textModel(): ITextModel | null | undefined {
    return this._refModel?.object.textEditorModel
  }

  public get textContent(): string | undefined {
    return this._refModel?.object.textEditorModel?.getValue()
  }

  public async createEditor(htmlContainer: HTMLElement): Promise<void> {
    const refModel = await this._buildModel(this.content)
    this._editor = monaco.editor.create(htmlContainer, this.editorOptions)
    this._updateModel(refModel)
  }

  public async updateContent(content?: CodeContent): Promise<void> {
    const refModel = await this._buildModel(content)
    this._updateModel(refModel)
  }

  private async _buildModel(code?: CodeContent): Promise<IReference<ITextFileEditorModel> | undefined> {
    if (code) {
      const modelRef = await createModelReference(vscode.Uri.parse(code.uri), code.text)
      if (modelRef.object.textEditorModel?.getValue() !== code.text) {
        modelRef.object.textEditorModel?.setValue(code.text)
      }
      if (code.enforceLanguageId) {
        modelRef.object.setLanguageId(code.enforceLanguageId)
        this.logger.info(`Main languageId is enforced: ${code.enforceLanguageId}`)
      }
      return modelRef
    }
    return undefined
  }

  private _updateModel(refModel?: IReference<ITextFileEditorModel>) {
    let modified = false
    if (refModel !== this._refModel) {
      this._refModel?.dispose()
      this._refModel = refModel
      modified = true
    }
    if (!this._editor) return
    const model = this._refModel?.object.textEditorModel
    if (modified && model) {
      this._editor.setModel(model)
      this.emit('modelChange', model)
    }
  }

  public dispose(): void {
    this._refModel?.dispose()
    this._editor?.dispose()
    this._editor = undefined
  }
}

export const createEditorEnvironment = (
  env: CodeEnvironment,
  id: string,
  opt?: CodeEditorOptions,
  logger?: Logger,
): EditorEnvImpl => {
  return new EditorEnvImpl(env, id, opt, logger)
}
