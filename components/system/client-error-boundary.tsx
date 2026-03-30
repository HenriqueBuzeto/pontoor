"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export default class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch() {
    // Intentionally empty: we only want to surface the error in the UI.
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-white px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 className="text-xl font-semibold">Erro ao renderizar a página</h1>
            <p className="text-sm text-slate-700">
              A aplicação encontrou um erro no navegador e parou de renderizar.
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-mono text-xs whitespace-pre-wrap break-words">
                {this.state.error.name}: {this.state.error.message}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                onClick={() => window.location.reload()}
              >
                Recarregar
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                onClick={() => this.setState({ error: null })}
              >
                Tentar continuar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
