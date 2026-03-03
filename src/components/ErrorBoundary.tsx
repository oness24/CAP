import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="p-6 flex flex-col gap-4">
          <div
            className="rounded-xl p-5"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <h2
              className="text-base font-semibold mb-2"
              style={{ color: '#F87171' }}
            >
              Something went wrong
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              An error occurred while rendering this page.
            </p>
            <pre
              className="text-xs p-3 rounded-lg overflow-auto max-h-40"
              style={{
                background: 'rgba(0,0,0,0.3)',
                color: '#FCA5A5',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              {this.state.error?.message}
              {'\n'}
              {this.state.error?.stack}
            </pre>
            <button
              className="mt-3 px-4 py-1.5 text-xs font-medium rounded-lg"
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
              }}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
