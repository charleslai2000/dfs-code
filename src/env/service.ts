import type { ManagedService } from './types'

export abstract class ManagedServiceImpl implements ManagedService {
  private _startup: Promise<void> | null = null
  private _shutdown: Promise<void> | null = null

  abstract readonly isRunning: boolean
  public async start(): Promise<void> {
    if (this._startup) return this._startup
    if (this._shutdown) await this._shutdown

    this._startup = (async () => {
      try {
        await this.doStartup()
      } finally {
        this._startup = null
      }
    })()
    return this._startup
  }

  public async stop(...args: any[]): Promise<void> {
    if (this._shutdown) return this._shutdown
    if (this._startup) await this._startup
    this._shutdown = (async () => {
      try {
        await this.doShutdown(...args)
      } finally {
        this._shutdown = null
      }
    })()
    return this._shutdown
  }

  protected abstract doStartup(): Promise<void>

  protected abstract doShutdown(...args: any[]): Promise<void>
}
