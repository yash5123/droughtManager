import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-primary, #e0e0e0)',
          fontFamily: 'var(--font-body, sans-serif)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 1.5rem', opacity: 0.7, maxWidth: '400px', fontSize: '0.875rem' }}>
            A component encountered an unexpected error. You can try recovering or refresh the page.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #333)',
              background: 'var(--accent-blue, #00b4d8)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
