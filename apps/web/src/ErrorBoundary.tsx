import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Error de interfaz no recuperable", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <main className="app-error-boundary" role="alert" aria-labelledby="app-error-title">
        <section>
          <p className="eyebrow">MICRO APP</p>
          <h1 id="app-error-title">No pudimos mostrar esta pantalla</h1>
          <p>Ocurrió un error inesperado. Puedes volver a cargar la aplicación. Si estabas realizando una operación, verifica su estado antes de repetirla.</p>
          <button type="button" onClick={() => window.location.reload()}>Volver a cargar</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}
