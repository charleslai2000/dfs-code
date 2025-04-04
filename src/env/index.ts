import React from 'react'
import type { EditorEnvironment } from './types'

export * from './types'

export const EditorContext = React.createContext<EditorEnvironment>({} as EditorEnvironment)
export { CodeEnvLoader } from './code-env-loader'
