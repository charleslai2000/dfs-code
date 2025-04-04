import React, { Suspense } from 'react'
import { ErrorBoundary, SuspendableValue } from '@nexp/front-lib/provider'
import { Typography } from '@mui/material'
import type { IStandaloneEditorConstructionOptions } from '@codingame/monaco-vscode-api/vscode/vs/editor/standalone/browser/standaloneCodeEditor'
import { LoaderPanel, SpinLoader } from '@nexp/front-lib/components'
import type { CodeContent, CodeEnvironment, EditorEnvironment } from '../env'
import { EditorContext } from '../env'

const FCInnerProvider: React.FC<React.PropsWithChildren<{ env: SuspendableValue<EditorEnvironment> }>> = props => {
  const env = props.env.value
  if (env === null) {
    return (
      <Typography color='error' variant='h4'>
        代码编辑器未就绪
      </Typography>
    )
  }
  return <EditorContext.Provider value={env}>{props.children}</EditorContext.Provider>
}

interface StandardEditorProviderProps {
  env: CodeEnvironment
  id: string
  content?: CodeContent
  domReadOnly?: boolean
  readOnly?: boolean
  overrideAutomaticLayout?: boolean
  editorOptions?: IStandaloneEditorConstructionOptions
  logLevel: number
}

export const CodeEditorProvider: React.FC<React.PropsWithChildren<StandardEditorProviderProps>> = props => {
  const { env: codeEnv, id, logLevel, children, ...rest } = props
  const [env, setEnv] = React.useState<SuspendableValue<EditorEnvironment>>()
  const context = codeEnv.context
  React.useEffect(() => {
    // already initialized.
    const env = new SuspendableValue<EditorEnvironment>({
      onClose: env => Promise.resolve(env.dispose()),
    }).setAsyncValue(async (env): Promise<EditorEnvironment | null> => {
      // for react strict model
      if (env.closed) return null
      // import and create editor environment
      const { createEditorEnvironment } = await import('../env/editor-env')
      const instance: EditorEnvironment = createEditorEnvironment(codeEnv, id, {
        ...rest,
      })
      return instance
    })
    setEnv(env)
    return () => {
      setEnv(undefined)
      env.close().catch(e => context.log.e('Error when disposing editor environment:%s.', e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context])

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoaderPanel loader={<SpinLoader fontSize='large' />} loading />}>
        {env && <FCInnerProvider env={env}>{children}</FCInnerProvider>}
      </Suspense>
    </ErrorBoundary>
  )
}
