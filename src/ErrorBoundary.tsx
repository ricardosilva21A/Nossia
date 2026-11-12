import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

// If one screen breaks, show a way back instead of a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Nossia: um ecrã falhou", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash-screen" role="alert">
        <h1>Algo correu mal</h1>
        <p>Os vossos dados estão guardados. Recarreguem a app para continuar.</p>
        <div className="panel-actions">
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Recarregar</button>
          <a className="button button-ghost" href="/hoje">Voltar ao Hoje</a>
        </div>
      </main>
    );
  }
}
