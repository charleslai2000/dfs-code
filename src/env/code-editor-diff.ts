import * as vscode from 'vscode'
import * as monaco from '@codingame/monaco-vscode-editor-api'
import type { ITextFileEditorModel } from '@codingame/monaco-vscode-api/monaco'
import { createModelReference, DisposableStore } from '@codingame/monaco-vscode-api/monaco'
import type { IReference } from '@codingame/monaco-vscode-editor-service-override'
import { ConsoleLogger, type Logger } from 'monaco-languageclient/tools'
import { StandaloneServices, ConfigurationTarget, IConfigurationService } from '@codingame/monaco-vscode-api'
import type { CodeContent, CodeEnvironment, CodeResources, ModelRefs, TextContents, TextModels } from './types'

export interface CodeEditorOptions<
  DIFF extends boolean = true,
  OPT = DIFF extends true
    ? monaco.editor.IDiffEditorConstructionOptions
    : monaco.editor.IStandaloneEditorConstructionOptions,
> {
  codeResources?: CodeResources
  domReadOnly?: boolean
  readOnly?: boolean
  overrideAutomaticLayout?: boolean
  editorOptions?: OPT
  workerFactory?: (logger?: Logger) => void
}

export abstract class EditorEnvImpl<
  DIFF extends boolean = true,
  Editor = DIFF extends true ? monaco.editor.IStandaloneDiffEditor : monaco.editor.IStandaloneCodeEditor,
> {
  protected logger: Logger
  protected _editor?: Editor
  private _disposableStoreMonaco = new DisposableStore()
  protected modelRefModified?: IReference<ITextFileEditorModel>
  protected modelRefOriginal?: IReference<ITextFileEditorModel>

  protected modelUpdateCallback?: (textModels: TextModels) => void

  codeResources?: CodeResources
  domReadOnly?: boolean
  readOnly?: boolean
  overrideAutomaticLayout?: boolean
  editorOptions?: OPT
  workerFactory?: (logger?: Logger) => void
  public readonly opt: CodeEditorOptions<DIFF>

  constructor(
    public readonly env: CodeEnvironment,
    public readonly id: string,
    opt?: CodeEditorOptions,
    logger?: Logger,
  ) {
    this.logger = logger ?? new ConsoleLogger()
    this.opt = {
      codeResources: opt?.codeResources,
      readOnly: opt?.readOnly ?? false,
      domReadOnly: opt?.domReadOnly ?? false,
      overrideAutomaticLayout: opt?.overrideAutomaticLayout ?? true,
      editorOptions: {
        ...opt?.editorOptions,
        automaticLayout: opt?.overrideAutomaticLayout ?? true,
      },
    }
  }

  public getConfig() {
    return this.opt
  }

  public haveEditor() {
    return Boolean(this._editor)
  }

  public getEditor() {
    return this._editor
  }

  public async createEditors(htmlContainer: HTMLElement): Promise<void> {
    const modelRefs = await this.buildModelRefs(this.opt.codeResources)
    this._editor = this.opt.useDiffEditor
      ? (monaco.editor.createDiffEditor(htmlContainer, this.opt.editorOptions) as Editor)
      : (monaco.editor.create(htmlContainer, this.opt.editorOptions) as Editor)

    this.updateEditorModels(modelRefs)
  }

  public getTextContents(): TextContents {
    const { modelRefModified, modelRefOriginal } = this.getModelRefs()
    return {
      modified: modelRefModified?.object.textEditorModel?.getValue(),
      original: modelRefOriginal?.object.textEditorModel?.getValue(),
    }
  }

  public getTextModels(): TextModels {
    const { modelRefModified, modelRefOriginal } = this.getModelRefs()
    return {
      modified: modelRefModified?.object.textEditorModel,
      original: modelRefOriginal?.object.textEditorModel,
    }
  }

  public getModelRefs(): ModelRefs {
    return {
      modelRefModified: this.modelRefModified,
      modelRefOriginal: this.modelRefOriginal,
    }
  }

  public registerModelUpdate(modelUpdateCallback: (textModels: TextModels) => void) {
    this.modelUpdateCallback = modelUpdateCallback
  }

  public async updateCodeResources(codeResources?: CodeResources): Promise<void> {
    const modelRefs = await this.buildModelRefs(codeResources)
    this.updateEditorModels(modelRefs)
  }

  private async _buildModelReference(code?: CodeContent): Promise<IReference<ITextFileEditorModel> | undefined> {
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

  public async buildModelRefs(codeResources?: CodeResources): Promise<ModelRefs> {
    const modelRefModified = await this._buildModelReference(codeResources?.modified)
    const modelRefOriginal = await this._buildModelReference(codeResources?.original)
    return { modelRefModified, modelRefOriginal }
  }

  public abstract updateEditorModels(modelRefs: ModelRefs): void

  public registerTextChangeCallback(onTextChanged?: (textChanges: TextContents) => void) {
    this.registerModelUpdate((textModels: TextModels) => {
      this._disposableStoreMonaco.clear()
      if (textModels.modified) {
        this._disposableStoreMonaco.add(
          textModels.modified.onDidChangeContent(() => {
            this._didModelContentChange(textModels, onTextChanged)
          }),
        )
      }
      if (textModels.original) {
        this._disposableStoreMonaco.add(
          textModels.original.onDidChangeContent(() => {
            this._didModelContentChange(textModels, onTextChanged)
          }),
        )
      }
      this._didModelContentChange(textModels, onTextChanged)
    })
  }

  private _didModelContentChange(textModels: TextModels, onTextChanged?: (textChanges: TextContents) => void) {
    const modified = textModels.modified?.getValue() ?? ''
    const original = textModels.original?.getValue() ?? ''
    onTextChanged?.({ modified, original })
  }

  public dispose(): void {
    this.modelRefModified?.dispose()
    this.modelRefOriginal?.dispose()
    this._editor?.dispose()
    this._editor = undefined
    this._disposableStoreMonaco.dispose()
  }
}

export class CodeEditorDiff extends EditorEnvImpl<true> {
  constructor(
    public readonly env: CodeContext,
    opt?: CodeEditorOptions<true>,
    logger?: Logger,
  ) {
    super(env, opt, logger)
  }

  public getConfig() {
    return this.opt
  }

  public get editor() {
    return this._editor
  }

  public async createEditors(htmlContainer: HTMLElement): Promise<void> {
    const modelRefs = await this.buildModelRefs(this.opt.codeResources)
    this._editor = monaco.editor.createDiffEditor(htmlContainer, this.opt.editorOptions)
    this.updateEditorModels(modelRefs)
  }

  public updateEditorModels(modelRefs: ModelRefs) {
    const { modelRefModified, modelRefOriginal } = modelRefs

    let updateModified = false
    let updateOriginal = false

    if (modelRefModified !== this.modelRefModified) {
      this.modelRefModified?.dispose()
      this.modelRefModified = modelRefModified
      updateModified = true
    }

    if (modelRefOriginal !== this.modelRefOriginal) {
      this.modelRefOriginal?.dispose()
      this.modelRefOriginal = modelRefOriginal
      updateOriginal = true
    }

    if (this._editor) {
      const textModelModified = this.modelRefModified?.object.textEditorModel
      const textModelOriginal = this.modelRefOriginal?.object.textEditorModel
      if ((updateModified || updateOriginal) && textModelModified && textModelOriginal) {
        this._editor.setModel({ original: textModelOriginal, modified: textModelModified })
        this.modelUpdateCallback?.({ original: textModelOriginal, modified: textModelModified })
      } else {
        throw new Error('Cannot update models for DiffEditor, original model is missing.')
      }
    }
  }
}

export class CodeEditorStandard extends EditorEnvImpl<false> {
  constructor(
    public readonly env: CodeContext,
    opt?: CodeEditorOptions,
    logger?: Logger,
  ) {
    super(env, opt, logger)
    if (this.opt.editorOptions?.['semanticHighlighting.enabled'] !== undefined) {
      StandaloneServices.get(IConfigurationService)
        .updateValue(
          'editor.semanticHighlighting.enabled',
          this.opt.editorOptions?.['semanticHighlighting.enabled'],
          ConfigurationTarget.USER,
        )
        .catch(e => this.logger.error(e))
    }
  }

  public getConfig() {
    return this.opt
  }

  public get editor() {
    return this._editor
  }

  public async createEditors(htmlContainer: HTMLElement): Promise<void> {
    const modelRefs = await this.buildModelRefs(this.opt.codeResources)
    this._editor = monaco.editor.create(htmlContainer, this.opt.editorOptions)
    this.updateEditorModels(modelRefs)
  }

  public updateEditorModels(modelRefs: ModelRefs) {
    const { modelRefModified, modelRefOriginal } = modelRefs

    let updateModified = false
    if (modelRefModified !== this.modelRefModified) {
      this.modelRefModified?.dispose()
      this.modelRefModified = modelRefModified
      updateModified = true
    }

    if (!this._editor) return

    const textModelModified = this.modelRefModified?.object.textEditorModel
    if (updateModified && textModelModified) {
      this._editor.setModel(textModelModified)
      this.modelUpdateCallback?.({ modified: textModelModified })
    }
  }
}
