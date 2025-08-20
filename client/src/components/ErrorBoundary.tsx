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

      return (
        <div
          style={{
            padding: '20px',
            margin: '20px',
            border: '2px solid #ff6b6b',
            borderRadius: '8px',
            backgroundColor: '#ffe0e0',
            color: '#333',
            fontFamily: 'monospace',
          }}
        >
          <h2 style={{ color: '#d32f2f' }}>⚠️ Something went wrong</h2>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (click to expand)
            </summary>
            <div style={{ marginTop: '10px' }}>
              <h3>Error:</h3>
              <pre
                style={{
                  backgroundColor: '#fff',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                {this.state.error && this.state.error.toString()}
              </pre>

              {this.state.errorInfo && (
                <>
                  <h3>Component Stack:</h3>
                  <pre
                    style={{
                      backgroundColor: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      fontSize: '12px',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}

              {this.state.error?.stack && (
                <>
                  <h3>Stack Trace:</h3>
                  <pre
                    style={{
                      backgroundColor: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      fontSize: '12px',
                    }}
                  >
                    {this.state.error.stack}
                  </pre>
                </>
              )}
            </div>
          </details>

          <div style={{ marginTop: '20px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
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
