import React from 'react'
import type { CodeEnvironment, EditorEnvironment } from './types'

export * from './types'

export const CodeContext = React.createContext<CodeEnvironment>({} as CodeEnvironment)
export const EditorContext = React.createContext<EditorEnvironment>({} as EditorEnvironment)
