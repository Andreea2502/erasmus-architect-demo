'use client';

/**
 * ERROR BOUNDARY COMPONENT
 * ========================
 * Catches JavaScript errors in child component tree and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to localStorage for debugging
    try {
      const errorLog = JSON.parse(localStorage.getItem('error-log') || '[]');
      errorLog.push({
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
      // Keep only last 10 errors
      if (errorLog.length > 10) errorLog.shift();
      localStorage.setItem('error-log', JSON.stringify(errorLog));
    } catch {
      // Ignore localStorage errors
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Etwas ist schiefgelaufen</h2>
                  <p className="text-red-100 text-sm">
                    Ein unerwarteter Fehler ist aufgetreten
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Error message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium text-sm">
                  {this.state.error?.message || 'Unbekannter Fehler'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Erneut versuchen
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Seite neu laden
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Zur Startseite
                </button>
              </div>

              {/* Technical details (collapsible) */}
              <details className="text-sm text-gray-500">
                <summary className="cursor-pointer flex items-center gap-2 py-2 hover:text-gray-700">
                  <Bug className="h-4 w-4" />
                  Technische Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded-lg overflow-auto max-h-40">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {this.state.error?.stack || 'Keine Stack-Trace verfügbar'}
                  </pre>
                </div>
              </details>

              {/* Help text */}
              <p className="text-xs text-gray-400 text-center">
                Falls das Problem bestehen bleibt, versuchen Sie die Browserdaten zu löschen
                oder kontaktieren Sie den Support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook-friendly error boundary wrapper
 */
export function ErrorBoundaryWrapper({
  children,
  fallbackMessage = 'Dieser Bereich konnte nicht geladen werden',
}: {
  children: ReactNode;
  fallbackMessage?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-2" />
          <p className="text-orange-700 text-sm">{fallbackMessage}</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
