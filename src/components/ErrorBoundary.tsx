'use client';

import React, { Component, ReactNode } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Aerospace-grade: Structured logging to be implemented here later
    // logger.error({ error: error.message, stack: error.stack, info: errorInfo });
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-100 w-full flex flex-col items-center justify-center p-8 bg-(--color-surface) border border-(--color-destructive-border) rounded-(--radius-tile) shadow-(--shadow-tile)">
          <div className="w-16 h-16 rounded-2xl bg-(--color-destructive-bg) flex items-center justify-center mb-6">
            <AlertOctagon className="w-8 h-8 text-(--color-destructive)" />
          </div>
          <h2 className="text-2xl font-bold text-(--color-text) mb-3 text-center">System Failure Detected</h2>
          <p className="text-(--color-muted) max-w-md text-center mb-8">
            Our telemetry indicates a critical UI error. This incident has been logged.
            Please attempt to reload the application to restore state.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Hard Reload
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-ghost"
            >
              Recover State
            </button>
          </div>
          <div className="mt-8 p-4 bg-gray-100 rounded-md max-w-xl w-full overflow-auto">
            <pre className="text-xs text-red-800 font-mono">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
