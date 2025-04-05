import type { ServiceLoader } from '@nexp/front-lib/platform'
import type { UserConfiguration } from 'monaco-languageclient/vscode/services'
import type { CodeEnvironmentProp } from './types'

export * from './types'

export interface CodeEnvLoaderOptions {
  userConfiguration?: UserConfiguration
}

export const CodeEnvLoader: ServiceLoader<CodeEnvLoaderOptions> = async (context, options, progress) => {
  const { createEnvironment } = await import('./code-env')
  progress?.({ progress: 0.5, message: '编码系统加载完成' })
  // await import('@codingame/monaco-vscode-json-default-extension')
  // await import('@codingame/monaco-vscode-python-default-extension')
  const instance = createEnvironment(
    context,
    {
      viewsConfig: {
        viewServiceType: 'ViewsService',
      },
      userConfiguration: options?.userConfiguration ?? {
        json: JSON.stringify({
          'workbench.colorTheme': 'Default Dark+',
          'editor.guides.bracketPairsHorizontal': 'active',
          'editor.lightbulb.enabled': 'On',
          'editor.wordBasedSuggestions': 'off',
          'editor.experimental.asyncTokenization': true,
          'workbench.iconTheme': 'vs-seti',
          'editor.autoClosingBrackets': 'languageDefined',
          'editor.autoClosingQuotes': 'languageDefined',
          'editor.scrollBeyondLastLine': true,
          'editor.mouseWheelZoom': true,
          'editor.acceptSuggestionOnEnter': 'on',
          'editor.foldingHighlight': false,
          'editor.semanticHighlighting.enabled': true,
          'editor.bracketPairColorization.enabled': false,
          'editor.fontSize': 12,
          'accessibility.signals.lineHasError': {
            sound: 'on',
          },
          'accessibility.signals.onDebugBreak': {
            sound: 'on',
          },
          'files.autoSave': 'off',
          'debug.toolBarLocation': 'docked',
          'terminal.integrated.tabs.title': '${sequence}',
          'typescript.tsserver.log': 'normal',
          'workbench.sideBar.location': 'left',
          'editor.experimental.preferTreeSitter': ['typescript'],
        }),
      },
    },
    { logLevel: context.debug ? 1 : !context.development ? 4 : 2 },
  )
  const subQuota = 1 - 0.5
  await instance.init(prog => progress?.({ ...prog, progress: (prog.progress ?? 0) * subQuota }))
  context.setProperty<CodeEnvironmentProp>({ name: 'service.code', environment: instance })
}
