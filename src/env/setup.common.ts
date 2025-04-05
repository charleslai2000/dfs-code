import * as monaco from '@codingame/monaco-vscode-editor-api'
import { LogLevel, type IWorkbenchConstructionOptions } from '@codingame/monaco-vscode-api'

export const constructOptions: IWorkbenchConstructionOptions = {
  // 用于指定远程连接的 Authority（比如 Codespaces、GitHub Dev、某个远端 SSH）
  // remoteAuthority,
  enableWorkspaceTrust: true,
  // connectionToken,
  windowIndicator: {
    label: '通用智能大数据平台',
    tooltip: '',
    command: '',
  },
  workspaceProvider: {
    trusted: true,
    open: (workspace, options) => {
      window.open(window.location.href)
      return Promise.resolve(true)
    },
    // https://code.visualstudio.com/api/references/vscode-api#workspace
    workspace: {
      workspaceUri: monaco.Uri.file('/workspace.code-workspace'),
    },
    // remotePath == null
    // ? {
    //     workspaceUri: workspaceFile,
    //   }
    // : {
    //     folderUri: monaco.Uri.from({
    //       scheme: 'vscode-remote',
    //       path: remotePath,
    //       authority: remoteAuthority,
    //     }),
    //   },
  },
  developmentOptions: {
    logLevel: LogLevel.Info, // Default value
  },
  configurationDefaults: {
    'window.title': 'Monaco-Vscode-Api${separator}${dirty}${activeEditorShort}',
  },
  defaultLayout: {
    // editors: useHtmlFileSystemProvider
    //   ? undefined
    //   : [
    //       {
    //         uri: monaco.Uri.file('/workspace/test.js'),
    //         viewColumn: 1,
    //       },
    //       {
    //         uri: monaco.Uri.file('/workspace/test.md'),
    //         viewColumn: 2,
    //       },
    //     ],
    // layout: useHtmlFileSystemProvider
    //   ? undefined
    //   : {
    //       editors: {
    //         orientation: 0,
    //         groups: [{ size: 1 }, { size: 1 }],
    //       },
    //     },
    views: [
      {
        id: 'custom-view',
      },
    ],
    force: true, // force layout reset.
  },
  welcomeBanner: {
    message: '欢迎使用开发环境',
  },
  productConfiguration: {
    nameShort: 'monaco-vscode-apiXXXX',
    nameLong: 'monaco-vscode-api',
    // extensionsGallery: {
    //   serviceUrl: 'https://open-vsx.org/vscode/gallery',
    //   itemUrl: 'https://open-vsx.org/vscode/item',
    //   resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
    //   extensionUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest', // https://github.com/eclipse/openvsx/issues/1036#issuecomment-2476449435
    //   controlUrl: '',
    //   nlsBaseUrl: '',
    //   publisherUrl: '',
    // },
  },
}
