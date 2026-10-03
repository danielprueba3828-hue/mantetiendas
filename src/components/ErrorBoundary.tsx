import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Error capturado:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '16px auto',
          maxWidth: '520px',
          width: '90%',
          background: 'var(--bg-surface, #1e293b)',
          border: '1.5px solid #ef4444',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          color: 'var(--text-main, #f8fafc)',
          fontFamily: 'Outfit, sans-serif'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            margin: '0 auto 14px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem'
          }}>
            ⚠️
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800 }}>
            {this.props.fallbackTitle || "Tuvimos un inconveniente al cargar esta vista"}
          </h3>

          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
            {this.props.fallbackMessage || "No te preocupes, tus datos están a salvo. Puedes reintentar o cerrar esta ventana para continuar con la aplicación."}
          </p>

          {this.state.error?.message && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              color: '#f87171',
              fontFamily: 'monospace',
              marginBottom: '16px',
              wordBreak: 'break-word',
              textAlign: 'left'
            }}>
              Detalle: {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔄 Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                color: 'var(--text-muted, #94a3b8)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Recargar App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
