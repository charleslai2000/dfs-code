import type { ITerminalChildProcess } from '@codingame/monaco-vscode-terminal-service-override'
import { SimpleTerminalBackend, SimpleTerminalProcess } from '@codingame/monaco-vscode-terminal-service-override'
import ansiColors from 'ansi-colors'
import * as vscode from 'vscode'

export class TerminalBackend extends SimpleTerminalBackend {
  override getDefaultSystemShell = (): Promise<string> => Promise.resolve('fake')
  override createProcess = (): Promise<ITerminalChildProcess> => {
    const dataEmitter = new vscode.EventEmitter<string>()
    const propertyEmitter = new vscode.EventEmitter<{
      type: string
      value: string
    }>()
    class FakeTerminalProcess extends SimpleTerminalProcess {
      private _column = 0
      public async start(): Promise<undefined> {
        ansiColors.enabled = true
        dataEmitter.fire(`This is a fake terminal\r\n${ansiColors.green('$')} `)
        setTimeout(() => {
          dataEmitter.fire('\u001B]0;Fake terminal title\u0007')
        }, 0)
        this._column = 2

        return Promise.resolve(undefined)
      }

      override onDidChangeProperty = propertyEmitter.event

      public override shutdown(immediate: boolean): void {
        console.log('shutdown', immediate)
      }

      public override input(data: string): void {
        for (const c of data) {
          if (c.charCodeAt(0) === 13) {
            dataEmitter.fire(`\r\n${ansiColors.green('$')} `)
            this._column = 2
          } else if (c.charCodeAt(0) === 127) {
            if (this._column > 2) {
              dataEmitter.fire('\b \b')
              this._column--
            }
          } else {
            dataEmitter.fire(c)
            this._column++
          }
        }
      }

      public resize(cols: number, rows: number): void {
        console.log('resize', cols, rows)
      }

      public override clearBuffer(): void | Promise<void> {}
    }
    return Promise.resolve(new FakeTerminalProcess(1, 1, '/workspace', dataEmitter.event))
  }
}
