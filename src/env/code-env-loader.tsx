import type { ServiceLoader } from '@nexp/front-lib/platform'
import type { UserConfiguration } from 'monaco-languageclient/vscode/services'
import type { CodeEnvironmentProp } from './types'

export interface CodeEnvLoaderOptions {
  userConfiguration?: UserConfiguration
}

export const CodeEnvLoader: ServiceLoader<CodeEnvLoaderOptions> = async (context, options, progress) => {
  const { createEnvironment } = await import('./code-env')
  progress?.({ progress: 0.5, message: '编码系统加载完成' })
  // await import('@codingame/monaco-vscode-json-default-extension')
  // await import('@codingame/monaco-vscode-python-default-extension')
  // let lscConfigs: Record<string, LanguageClientConfig> | undefined = undefined
  // if (props.languageClients) {
  //   lscConfigs = {}
  //   const lspEndpoint = context.host.serviceEndpoints.language
  //   Object.entries(props.languageClients).forEach(([name, options]) => {
  //     lscConfigs![name] = {
  //       name: `Language client ${name.toUpperCase()}`,
  //       clientOptions: options,
  //       restartOptions: {
  //         retries: 3,
  //         timeout: 3000,
  //         keepWorker: true,
  //       },
  //       connection: {
  //         options: {
  //           $type: 'WebSocketUrl',
  //           url: `${lspEndpoint}/${name}`,
  //           startOptions: {
  //             onCall: () => {
  //               console.log('Connected to socket.')
  //             },
  //             reportStatus: true,
  //           },
  //           stopOptions: {
  //             onCall: () => {
  //               console.log('Disconnected from socket.')
  //             },
  //             reportStatus: true,
  //           },
  //         },
  //       },
  //     }
  //   })
  // }
  const instance = createEnvironment(
    context,
    {
      viewsConfig: {
        viewServiceType: 'ViewsService',
      },
      userConfiguration: options?.userConfiguration ?? {
        json: JSON.stringify({
          'workbench.colorTheme': 'Default Dark Modern',
          'editor.guides.bracketPairsHorizontal': 'active',
          'editor.lightbulb.enabled': 'On',
          'editor.wordBasedSuggestions': 'off',
          'editor.experimental.asyncTokenization': true,
        }),
      },
    },
    { logLevel: context.debug ? 1 : !context.development ? 4 : 2 },
  )
  const subQuota = 1 - 0.5
  await instance.init(prog => progress?.({ ...prog, progress: (prog.progress ?? 0) * subQuota }))
  context.setProperty<CodeEnvironmentProp>({ name: 'service.code', environment: instance })
}
