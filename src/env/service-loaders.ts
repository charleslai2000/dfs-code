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

// The following service is optional and not loaded by default
export const loadNotificationService = async () => {
  return await import('@codingame/monaco-vscode-notifications-service-override')
}
export const loadAuthenticationService = async () => {
  return await import('@codingame/monaco-vscode-authentication-service-override')
}
export const loadExtensionGalleryService = async () => {
  return await import('@codingame/monaco-vscode-extension-gallery-service-override')
}
export const loadBannerService = async () => {
  return await import('@codingame/monaco-vscode-view-banner-service-override')
}
export const loadStatusBarService = async () => {
  return await import('@codingame/monaco-vscode-view-status-bar-service-override')
}
export const loadTitleBarService = async () => {
  return await import('@codingame/monaco-vscode-view-title-bar-service-override')
}
export const loadSnippetService = async () => {
  return await import('@codingame/monaco-vscode-snippets-service-override')
}
export const loadOutputService = async () => {
  return await import('@codingame/monaco-vscode-output-service-override')
}
export const loadMarkersService = async () => {
  return await import('@codingame/monaco-vscode-markers-service-override')
}
export const loadAccessibilityService = async () => {
  return await import('@codingame/monaco-vscode-accessibility-service-override')
}
export const loadLanguageDetectionWorkerService = async () => {
  return await import('@codingame/monaco-vscode-language-detection-worker-service-override')
}
export const loadWorkspaceTrustService = async () => {
  return await import('@codingame/monaco-vscode-workspace-trust-service-override')
}
export const loadLogServiceOverride = async () => {
  return await import('@codingame/monaco-vscode-log-service-override')
}
export const loadWorkingCopyService = async () => {
  return await import('@codingame/monaco-vscode-working-copy-service-override')
}
export const loadWelcomeService = async () => {
  return await import('@codingame/monaco-vscode-welcome-service-override')
}
export const loadWalkThroughService = async () => {
  return await import('@codingame/monaco-vscode-walkthrough-service-override')
}
export const loadUserDataSyncService = async () => {
  return await import('@codingame/monaco-vscode-user-data-sync-service-override')
}
export const loadUserDataProfileService = async () => {
  return await import('@codingame/monaco-vscode-user-data-profile-service-override')
}
export const loadAiService = async () => {
  return await import('@codingame/monaco-vscode-ai-service-override')
}
export const loadTimelineService = async () => {
  return await import('@codingame/monaco-vscode-timeline-service-override')
}
export const loadCommentsService = async () => {
  return await import('@codingame/monaco-vscode-comments-service-override')
}
export const loadEditSessionsService = async () => {
  return await import('@codingame/monaco-vscode-edit-sessions-service-override')
}
export const loadEmmetService = async () => {
  return await import('@codingame/monaco-vscode-emmet-service-override')
}
export const loadInteractiveService = async () => {
  return await import('@codingame/monaco-vscode-interactive-service-override')
}
export const loadIssueService = async () => {
  return await import('@codingame/monaco-vscode-issue-service-override')
}
export const loadMultiDiffEditorService = async () => {
  return await import('@codingame/monaco-vscode-multi-diff-editor-service-override')
}
export const loadPerformanceService = async () => {
  return await import('@codingame/monaco-vscode-performance-service-override')
}
export const loadRelauncherService = async () => {
  return await import('@codingame/monaco-vscode-relauncher-service-override')
}
export const loadShareService = async () => {
  return await import('@codingame/monaco-vscode-share-service-override')
}
export const loadSpeechService = async () => {
  return await import('@codingame/monaco-vscode-speech-service-override')
}
export const loadSurveyService = async () => {
  return await import('@codingame/monaco-vscode-survey-service-override')
}
export const loadExplorerService = async () => {
  return await import('@codingame/monaco-vscode-explorer-service-override')
}
export const loadLocalizationService = async () => {
  return await import('@codingame/monaco-vscode-localization-service-override')
}
export const loadUpdateService = async () => {
  return await import('@codingame/monaco-vscode-update-service-override')
}
export const loadTreeSitterService = async () => {
  return await import('@codingame/monaco-vscode-treesitter-service-override')
}
export const loadTelemetryService = async () => {
  return await import('@codingame/monaco-vscode-telemetry-service-override')
}
export interface OptionalServiceExports {
  // add each options service
  notifications: AwaitedReturnType<typeof loadNotificationService>
  authentication: AwaitedReturnType<typeof loadAuthenticationService>
  extensionGallery: AwaitedReturnType<typeof loadExtensionGalleryService>
  banner: AwaitedReturnType<typeof loadBannerService>
  statusBar: AwaitedReturnType<typeof loadStatusBarService>
  titleBar: AwaitedReturnType<typeof loadTitleBarService>
  snippets: AwaitedReturnType<typeof loadSnippetService>
  output: AwaitedReturnType<typeof loadOutputService>
  markers: AwaitedReturnType<typeof loadMarkersService>
  accessibility: AwaitedReturnType<typeof loadAccessibilityService>
  languageDetectionWorker: AwaitedReturnType<typeof loadLanguageDetectionWorkerService>
  workspaceTrust: AwaitedReturnType<typeof loadWorkspaceTrustService>
  log: AwaitedReturnType<typeof loadLogServiceOverride>
  workingCopy: AwaitedReturnType<typeof loadWorkingCopyService>
  welcome: AwaitedReturnType<typeof loadWelcomeService>
  walkthrough: AwaitedReturnType<typeof loadWalkThroughService>
  userDataSync: AwaitedReturnType<typeof loadUserDataSyncService>
  userDataProfile: AwaitedReturnType<typeof loadUserDataProfileService>
  ai: AwaitedReturnType<typeof loadAiService>
  timeline: AwaitedReturnType<typeof loadTimelineService>
  comments: AwaitedReturnType<typeof loadCommentsService>
  editSessions: AwaitedReturnType<typeof loadEditSessionsService>
  emmet: AwaitedReturnType<typeof loadEmmetService>
  interactive: AwaitedReturnType<typeof loadInteractiveService>
  issue: AwaitedReturnType<typeof loadIssueService>
  multiDiffEditor: AwaitedReturnType<typeof loadMultiDiffEditorService>
  performance: AwaitedReturnType<typeof loadPerformanceService>
  relauncher: AwaitedReturnType<typeof loadRelauncherService>
  share: AwaitedReturnType<typeof loadShareService>
  speech: AwaitedReturnType<typeof loadSpeechService>
  survey: AwaitedReturnType<typeof loadSurveyService>
  update: AwaitedReturnType<typeof loadUpdateService>
  explorer: AwaitedReturnType<typeof loadExplorerService>
  localization: AwaitedReturnType<typeof loadLocalizationService>
  treesitter: AwaitedReturnType<typeof loadTreeSitterService>
  telemetry: AwaitedReturnType<typeof loadTelemetryService>
}

export type OptionalServiceNames = keyof OptionalServiceExports
export type OptionalServiceExport<T extends OptionalServiceNames> = OptionalServiceExports[T]

export type AllServiceNames = ServiceNames | OptionalServiceNames
export type AllServiceExport<T extends AllServiceNames> = T extends ServiceNames
  ? ServiceExports[T]
  : T extends OptionalServiceNames
    ? OptionalServiceExports[T]
    : never

export type AllServiceDefault<T extends AllServiceNames> = AllServiceExport<T> extends { default: infer U } ? U : never
export type ParametersOf<T extends AllServiceNames> =
  AllServiceExport<T> extends {
    default: (...args: infer U) => any
  }
    ? U
    : never
