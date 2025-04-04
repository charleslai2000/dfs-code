import EventEmitter from 'events'
import type { CodeEnvironment, ManagedService, ServiceEvents } from './types'

export abstract class ManagedServiceImpl<T extends ManagedService<T, E>, E extends ServiceEvents<T> = ServiceEvents<T>>
  // @ts-expect-error type error
  extends EventEmitter<E>
  implements ManagedService<T, ServiceEvents<T>>
{
  private _startup: Promise<void> | null = null
  private _shutdown: Promise<void> | null = null
  private _isRunning = false

  constructor(
    public readonly env: CodeEnvironment,
    public readonly id: string,
  ) {
    super()
  }

  public get isRunning(): boolean {
    return this._isRunning
  }

  public async start(...args: any[]): Promise<void> {
    if (this._startup) return this._startup
    if (this._shutdown) await this._shutdown

    this._startup = (async () => {
      try {
        await this.doStartup(...args)
        // @ts-expect-error type error
        this.emit('started', this as unknown as T)
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
        // @ts-expect-error type error
        this.emit('stopped', this as unknown as T)
      } finally {
        this._shutdown = null
      }
    })()
    return this._shutdown
  }

  protected abstract doStartup(...args: any[]): Promise<void>

  protected abstract doShutdown(...args: any[]): Promise<void>
}
