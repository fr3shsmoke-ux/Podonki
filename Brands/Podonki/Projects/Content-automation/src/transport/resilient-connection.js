/**
 * WebSocket + polling hybrid with exponential backoff
 * Auto-switches between WS and HTTP polling based on availability
 */

const DEFAULT_OPTIONS = {
  wsUrl: null,
  pollUrl: null,
  pollIntervalMs: 3000,
  maxBackoffMs: 60000,
  initialBackoffMs: 1000,
  maxRetries: Infinity,
}

class ResilientConnection {
  constructor(options = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options }
    this.ws = null
    this.pollTimer = null
    this.backoffMs = this.opts.initialBackoffMs
    this.retries = 0
    this.mode = 'disconnected' // 'ws' | 'polling' | 'disconnected'
    this.listeners = new Map()
    this.running = false
  }

  /**
   * Start connection — tries WebSocket first, falls back to polling
   */
  start() {
    this.running = true
    if (this.opts.wsUrl) {
      this._connectWs()
    } else if (this.opts.pollUrl) {
      this._startPolling()
    }
  }

  /**
   * Stop all connections
   */
  stop() {
    this.running = false
    this._closeWs()
    this._stopPolling()
    this.mode = 'disconnected'
  }

  /**
   * Register event listener
   */
  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(fn)
    return this
  }

  /**
   * Remove event listener
   */
  off(event, fn) {
    const fns = this.listeners.get(event)
    if (fns) {
      this.listeners.set(event, fns.filter(f => f !== fn))
    }
    return this
  }

  /**
   * Emit event to all listeners
   */
  _emit(event, data) {
    const fns = this.listeners.get(event) || []
    for (const fn of fns) {
      try { fn(data) } catch {}
    }
  }

  /**
   * Connect via WebSocket
   */
  async _connectWs() {
    if (!this.running) return

    try {
      const { WebSocket: WS } = await import('ws')
      this.ws = new WS(this.opts.wsUrl)

      this.ws.on('open', () => {
        this.mode = 'ws'
        this.backoffMs = this.opts.initialBackoffMs
        this.retries = 0
        this._stopPolling()
        this._emit('connected', { mode: 'ws' })
      })

      this.ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString())
          this._emit('message', data)
        } catch {
          this._emit('message', raw.toString())
        }
      })

      this.ws.on('close', () => {
        this.mode = 'disconnected'
        this._emit('disconnected', { reason: 'ws_closed' })
        this._reconnect()
      })

      this.ws.on('error', () => {
        this._closeWs()
        this._reconnect()
      })
    } catch {
      // ws module not installed — fall back to polling
      this._startPolling()
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  _reconnect() {
    if (!this.running) return
    if (this.retries >= this.opts.maxRetries) {
      this._emit('max_retries', { retries: this.retries })
      return
    }

    this.retries++
    const jitter = Math.random() * this.backoffMs * 0.3
    const delay = Math.min(this.backoffMs + jitter, this.opts.maxBackoffMs)

    this._emit('reconnecting', { attempt: this.retries, delay: Math.round(delay) })

    setTimeout(() => {
      if (!this.running) return
      this.backoffMs = Math.min(this.backoffMs * 2, this.opts.maxBackoffMs)

      if (this.opts.wsUrl) {
        this._connectWs()
      } else {
        this._startPolling()
      }
    }, delay)
  }

  /**
   * Start HTTP polling as fallback
   */
  _startPolling() {
    if (!this.running || !this.opts.pollUrl || this.pollTimer) return

    this.mode = 'polling'
    this._emit('connected', { mode: 'polling' })

    const poll = async () => {
      if (!this.running) return

      try {
        const res = await fetch(this.opts.pollUrl)
        if (res.ok) {
          const data = await res.json()
          this._emit('message', data)
          this.backoffMs = this.opts.initialBackoffMs
        }
      } catch {
        this.backoffMs = Math.min(this.backoffMs * 1.5, this.opts.maxBackoffMs)
      }

      if (this.running) {
        this.pollTimer = setTimeout(poll, Math.min(this.opts.pollIntervalMs + this.backoffMs - this.opts.initialBackoffMs, this.opts.maxBackoffMs))
      }
    }

    this.pollTimer = setTimeout(poll, 0)
  }

  /**
   * Stop polling
   */
  _stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  /**
   * Close WebSocket
   */
  _closeWs() {
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
  }

  /**
   * Send message (only via WebSocket)
   */
  send(data) {
    if (this.mode === 'ws' && this.ws?.readyState === 1) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data))
      return true
    }
    return false
  }

  get connected() {
    return this.mode !== 'disconnected'
  }

  get currentMode() {
    return this.mode
  }
}

export default ResilientConnection
