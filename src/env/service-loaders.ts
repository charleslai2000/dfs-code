/**
 * Monaco-vscode-api automatically loads the following services:
 *  - layout
 *  - environment
 *  - extension
 *  - files
 *  - quickAccess
 * monaco-languageclient always adds the following services:
 *   - languages
 *   - log
 *   - model
 */
// environment
export const loadConfigurationService = async () => {
  return await import('@codingame/monaco-vscode-configuration-service-override')
}
export const loadHostService = async () => {
  return await import('@codingame/monaco-vscode-host-service-override')
}
export const loadThemeService = async () => {
  return await import('@codingame/monaco-vscode-theme-service-override')
}
export const loadKeybindingsService = async () => {
  return await import('@codingame/monaco-vscode-keybindings-service-override')
}
export const loadStorageService = async () => {
  return await import('@codingame/monaco-vscode-storage-service-override')
}
export const loadLifecycleService = async () => {
  return await import('@codingame/monaco-vscode-lifecycle-service-override')
}
// extension
export const loadExtensionsService = async () => {
  return await import('@codingame/monaco-vscode-extensions-service-override')
}
// files
export const loadFilesService = async () => {
  return await import('@codingame/monaco-vscode-files-service-override')
}
// quickaccess
export const loadQuickAccessService = async () => {
  return await import('@codingame/monaco-vscode-quickaccess-service-override')
}
// layout
export const loadViewsService = async () => {
  return await import('@codingame/monaco-vscode-views-service-override')
}
export const loadWorkbenchService = async () => {
  return await import('@codingame/monaco-vscode-workbench-service-override')
}
export const loadEditorService = async () => {
  return await import('@codingame/monaco-vscode-editor-service-override')
}
// language
export const loadLanguagesService = async () => {
  return await import('@codingame/monaco-vscode-languages-service-override')
}
export const loadTextmateService = async () => {
  return await import('@codingame/monaco-vscode-textmate-service-override')
}
// model
export const loadModelService = async () => {
  return await import('@codingame/monaco-vscode-model-service-override')
}
// log
export const loadLogService = async () => {
  return await import('@codingame/monaco-vscode-log-service-override')
}

export const loadDialogService = async () => {
  return await import('@codingame/monaco-vscode-dialogs-service-override')
}
export const loadPreferencesService = async () => {
  return await import('@codingame/monaco-vscode-preferences-service-override')
}
export const loadRemoteAgentService = async () => {
  return await import('@codingame/monaco-vscode-remote-agent-service-override')
}
export const loadNotebookService = async () => {
  return await import('@codingame/monaco-vscode-notebook-service-override')
}
export const loadTerminalService = async () => {
  return await import('@codingame/monaco-vscode-terminal-service-override')
}
export const loadSearchService = async () => {
  return await import('@codingame/monaco-vscode-search-service-override')
}
export const loadTaskService = async () => {
  return await import('@codingame/monaco-vscode-task-service-override')
}
export const loadScmService = async () => {
  return await import('@codingame/monaco-vscode-scm-service-override')
}
export const loadChatService = async () => {
  return await import('@codingame/monaco-vscode-chat-service-override')
}
export const loadOutlineService = async () => {
  return await import('@codingame/monaco-vscode-outline-service-override')
}
export const loadDebugService = async () => {
  return await import('@codingame/monaco-vscode-debug-service-override')
}

type AwaitedReturnType<T extends (...args: any) => any> = Awaited<ReturnType<T>>

export interface ServiceExports {
  configuration: AwaitedReturnType<typeof loadConfigurationService>
  host: AwaitedReturnType<typeof loadHostService>
  theme: AwaitedReturnType<typeof loadThemeService>
  keybindings: AwaitedReturnType<typeof loadKeybindingsService>
  storage: AwaitedReturnType<typeof loadStorageService>
  lifecycle: AwaitedReturnType<typeof loadLifecycleService>
  extensions: AwaitedReturnType<typeof loadExtensionsService>
  files: AwaitedReturnType<typeof loadFilesService>
  quickaccess: AwaitedReturnType<typeof loadQuickAccessService>
  views: AwaitedReturnType<typeof loadViewsService>
  workbench: AwaitedReturnType<typeof loadWorkbenchService>
  editor: AwaitedReturnType<typeof loadEditorService>
  languages: AwaitedReturnType<typeof loadLanguagesService>
  textmate: AwaitedReturnType<typeof loadTextmateService>
  model: AwaitedReturnType<typeof loadModelService>
  log: AwaitedReturnType<typeof loadLogService>
  dialog: AwaitedReturnType<typeof loadDialogService>
  preferences: AwaitedReturnType<typeof loadPreferencesService>
  remoteAgent: AwaitedReturnType<typeof loadRemoteAgentService>
  notebook: AwaitedReturnType<typeof loadNotebookService>
  terminal: AwaitedReturnType<typeof loadTerminalService>
  search: AwaitedReturnType<typeof loadSearchService>
  task: AwaitedReturnType<typeof loadTaskService>
  scm: AwaitedReturnType<typeof loadScmService>
  chat: AwaitedReturnType<typeof loadChatService>
  outline: AwaitedReturnType<typeof loadOutlineService>
  debug: AwaitedReturnType<typeof loadDebugService>
}

export type ServiceNames = keyof ServiceExports
export type ServiceExport<T extends ServiceNames> = ServiceExports[T]
