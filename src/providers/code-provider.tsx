import type { UiContext } from '@nexp/front-lib/platform'
import React, { Suspense } from 'react'
import type { WorkingProgress } from '@nexp/front-lib/provider'
import { ErrorBoundary, SuspendableValue } from '@nexp/front-lib/provider'
import type { LogLevel } from '@codingame/monaco-vscode-api'
import { Typography } from '@mui/material'
import { errstr } from '@nexp/front-lib/utility'
import type { LanguageClientOptions } from 'vscode-languageclient'
import type { CodeEnvironment, LanguageClientConfig } from '../env'
import { CodeContext } from '../env'
import { CodeLoadingSplash } from './splash'

const FCInnerProvider: React.FC<React.PropsWithChildren<{ env: SuspendableValue<CodeEnvironment> }>> = props => {
  const env = props.env.value
  if (env === null) {
    return (
      <Typography color='error' variant='h4'>
        编码环境未就绪
      </Typography>
    )
  }
  return <CodeContext.Provider value={env}>{props.children}</CodeContext.Provider>
}

interface CodeContextProviderProps {
  context: UiContext
  logLevel: number
  languageClients?: Record<string, LanguageClientOptions>
}

// const codeOptions: CodeOptions = {
//   logLevel: 1,
//   languageClients: {
//     json: {
//       clientOptions: {
//         documentSelector: ['json'],
//       },
//       connection: {
//       },
//     },
//   },
//   },
// }
export const CodeContextProvider: React.FC<React.PropsWithChildren<CodeContextProviderProps>> = props => {
  const { context, logLevel, children } = props
  const [env, setEnv] = React.useState<SuspendableValue<CodeEnvironment>>()

  const [progress, setProgress] = React.useState<WorkingProgress>({ progress: 0, message: '加载中...' })
  React.useEffect(() => {
    // already initialized.
    const env = new SuspendableValue<CodeEnvironment>({
      onClose: env => env.dispose().catch(e => context.log.e('Error when disposing code environment:%s.', e)),
      progress: {
        callback: setProgress,
        onError: error => `加载错误：${errstr(error)}`,
        onSuccess: () => '加载成功',
      },
    }).setAsyncValue(async (env): Promise<CodeEnvironment | null> => {
      // for react strict model
      if (env.closed) return null
      // check and set monaco env
      let monacoEnv = window.MonacoEnvironment as any
      if (!monacoEnv) {
        monacoEnv = {}
        window.MonacoEnvironment = monacoEnv
      }
      // check to return existing instance
      let instance: CodeEnvironment | undefined = monacoEnv.instance
      if (instance) return instance

      // create new instance
      const { createEnvironment } = await import('../env/code-env')
      setProgress({ progress: 50, message: '完成核心库加载' })
      await import('@codingame/monaco-vscode-json-default-extension')
      let lscConfigs: Record<string, LanguageClientConfig> | undefined = undefined
      if (props.languageClients) {
        lscConfigs = {}
        const lspEndpoint = context.host.serviceEndpoints.language
        Object.entries(props.languageClients).forEach(([name, options]) => {
          lscConfigs![name] = {
            name: `Language client ${name.toUpperCase()}`,
            clientOptions: options,
            restartOptions: {
              retries: 3,
              timeout: 3000,
              keepWorker: true,
            },
            connection: {
              options: {
                $type: 'WebSocketUrl',
                url: `${lspEndpoint}/${name}`,
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
        })
      }

      instance = createEnvironment(
        context,
        {
          userConfiguration: {
            json: JSON.stringify({
              'workbench.colorTheme': 'Default Dark Modern',
              'editor.guides.bracketPairsHorizontal': 'active',
              'editor.lightbulb.enabled': 'On',
              'editor.wordBasedSuggestions': 'off',
              'editor.experimental.asyncTokenization': true,
            }),
          },
        },
        { logLevel: logLevel as LogLevel, languageClients: lscConfigs },
      )
      await instance.init(env.progress.bind(env))
      monacoEnv.instance = instance
      return instance
    })
    setEnv(env)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context])

  return (
    <ErrorBoundary>
      <Suspense fallback={<CodeLoadingSplash progress={progress} />}>
        {env && <FCInnerProvider env={env}>{children}</FCInnerProvider>}
      </Suspense>
    </ErrorBoundary>
  )
}
