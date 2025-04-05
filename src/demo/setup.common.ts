import type { IStoredWorkspace } from '@codingame/monaco-vscode-configuration-service-override'
import { initUserConfiguration } from '@codingame/monaco-vscode-configuration-service-override'
import { initUserKeybindings } from '@codingame/monaco-vscode-keybindings-service-override'
import {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  RegisteredReadOnlyFile,
  createIndexedDBProviders,
  registerHTMLFileSystemProvider,
  registerFileSystemOverlay,
  initFile,
} from '@codingame/monaco-vscode-files-service-override'
import * as monaco from '@codingame/monaco-vscode-editor-api'
import type { IEditorOverrideServices } from '@codingame/monaco-vscode-api'
import * as vscode from 'vscode'
import 'vscode/localExtensionHost'

const url = new URL(document.location.href)
const params = url.searchParams
export const remoteAuthority = params.get('remoteAuthority') ?? undefined
export const connectionToken = params.get('connectionToken') ?? undefined
export const remotePath = remoteAuthority != null ? (params.get('remotePath') ?? undefined) : undefined
export const resetLayout = params.has('resetLayout')
export const useHtmlFileSystemProvider = params.has('htmlFileSystemProvider')
params.delete('resetLayout')

window.history.replaceState({}, document.title, url.href)

export let workspaceFile = monaco.Uri.file('/workspace.code-workspace')

export const userDataProvider = await createIndexedDBProviders()

if (useHtmlFileSystemProvider) {
  workspaceFile = monaco.Uri.from({ scheme: 'tmp', path: '/test.code-workspace' })
  await initFile(
    workspaceFile,
    JSON.stringify(
      {
        folders: [],
      } as IStoredWorkspace,
      null,
      2,
    ),
  )

  registerHTMLFileSystemProvider()
} else {
  const fileSystemProvider = new RegisteredFileSystemProvider(false)

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file('/workspace/test.js'),
      `// import anotherfile
let variable = 1
function inc () {
  variable++
}

while (variable < 5000) {
  inc()
  console.log('Hello world', variable);
}`,
    ),
  )

  const content = new TextEncoder().encode('This is a readonly static file')
  fileSystemProvider.registerFile(
    new RegisteredReadOnlyFile(vscode.Uri.file('/workspace/test_readonly.js'), async () => content, content.length),
  )

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file('/workspace/jsconfig.json'),
      `{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "lib": [
      "es2021",
      "DOM"
    ]
  }
}`,
    ),
  )

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file('/workspace/index.html'),
      `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>monaco-vscode-api demo</title>
    <link rel="stylesheet" href="test.css">
  </head>
  <body>
    <style type="text/css">
      h1 {
        color: DeepSkyBlue;
      }
    </style>

    <h1>Hello, world!</h1>
  </body>
</html>`,
    ),
  )

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file('/workspace/test.md'),
      `
***Hello World***

Math block:
$$
\\displaystyle
\\left( \\sum_{k=1}^n a_k b_k \\right)^2
\\leq
\\left( \\sum_{k=1}^n a_k^2 \\right)
\\left( \\sum_{k=1}^n b_k^2 \\right)
$$

# Easy Math

2 + 2 = 4 // this test will pass
2 + 2 = 5 // this test will fail

# Harder Math

230230 + 5819123 = 6049353
`,
    ),
  )

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file('/workspace/test.customeditor'),
      `
Custom Editor!`,
    ),
  )

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file('/workspace/test.css'),
      `
h1 {
  color: DeepSkyBlue;
}`,
    ),
  )

  // Use a workspace file to be able to add another folder later (for the "Attach filesystem" button)
  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      workspaceFile,
      JSON.stringify(
        {
          folders: [
            {
              path: '/workspace',
            },
          ],
        } as IStoredWorkspace,
        null,
        2,
      ),
    ),
  )

  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      monaco.Uri.file('/workspace/.vscode/extensions.json'),
      JSON.stringify(
        {
          recommendations: ['vscodevim.vim'],
        },
        null,
        2,
      ),
    ),
  )
  registerFileSystemOverlay(1, fileSystemProvider)
}
