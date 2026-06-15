import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally reload the page
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const preStyle: React.CSSProperties = {
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        padding: 'var(--spacing-sm)',
        borderRadius: 'var(--border-radius-sm)',
        border: '1px solid var(--color-border)',
        overflow: 'auto',
        maxHeight: '200px',
        fontSize: 'var(--font-size-xs)',
      };

      return (
        <div
          className="alert alert--danger"
          role="alert"
          style={{
            margin: 'var(--spacing-lg)',
            fontFamily: 'var(--font-family-mono, monospace)',
            // Keep readable in dark mode: .alert--danger hard-codes a dark-red
            // text color that fails contrast on the dark-mode danger background.
            color: 'var(--color-text-primary)',
          }}
        >
          <h2 style={{ marginTop: 0 }}>⚠️ Something went wrong</h2>
          <details style={{ marginTop: 'var(--spacing-sm)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'var(--font-weight-bold)' }}>
              Error Details (click to expand)
            </summary>
            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              <h3>Error:</h3>
              <pre style={preStyle}>{this.state.error && this.state.error.toString()}</pre>

              {this.state.errorInfo && (
                <>
                  <h3>Component Stack:</h3>
                  <pre style={preStyle}>{this.state.errorInfo.componentStack}</pre>
                </>
              )}

              {this.state.error?.stack && (
                <>
                  <h3>Stack Trace:</h3>
                  <pre style={preStyle}>{this.state.error.stack}</pre>
                </>
              )}
            </div>
          </details>

          <div
            style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}
          >
            <button type="button" className="btn btn--success" onClick={this.handleReset}>
              Try Again
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
