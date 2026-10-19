import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiError, type AuthResponse } from "./auth";
import "./auth.css";

const modules = [
  { number: "01", title: "Caja y ventas", description: "Flujo de venta, cobro y comprobante.", status: "Pendiente de implementación" },
  { number: "02", title: "Inventario", description: "Existencias, movimientos y alertas de stock.", status: "Pendiente de implementación" },
  { number: "03", title: "Productos", description: "Catálogo, costos y precios en USD.", status: "Pendiente de implementación" },
  { number: "04", title: "Tasa BCV", description: "Conversión a VES con fuente y fecha verificables.", status: "Pendiente de integración" },
];

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<AuthResponse>("/auth/me")
      .then((result) => { if (active) setSession(result); })
      .catch((reason: unknown) => {
        if (!active) return;
        if (!(reason instanceof ApiError && reason.status === 401)) {
          setError(reason instanceof Error ? reason.message : "No se pudo comprobar la sesión.");
        }
      })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(result);
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
      setSession(null);
      setNotice("Has cerrado la sesión de forma segura.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return <main className="auth-loading" aria-live="polite"><span className="brand-mark" aria-hidden="true">m</span><p>Comprobando tu sesión…</p></main>;
  }

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-brand-panel" aria-label="Micro app">
          <a className="brand auth-brand" href="#inicio">
            <span className="brand-mark" aria-hidden="true">m</span>
            <span><strong>micro app</strong><small>GESTIÓN COMERCIAL</small></span>
          </a>
          <div className="auth-brand-copy">
            <p className="eyebrow">CLARIDAD PARA TU NEGOCIO</p>
            <h1>Todo empieza con una buena base.</h1>
            <p>Organiza tu negocio desde un espacio pensado para vender, controlar y crecer con confianza.</p>
          </div>
          <p className="auth-brand-foot">Punto de venta · Inventario · Control</p>
        </section>
        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand"><span className="brand-mark" aria-hidden="true">m</span><strong>micro app</strong></div>
            <p className="eyebrow auth-eyebrow">QUÉ BUENO TENERTE DE VUELTA</p>
            <h2>Inicia sesión</h2>
            <p className="auth-subtitle">Ingresa tus datos para continuar con tu negocio.</p>
            {error && <div className="form-alert error-alert" role="alert">{error}</div>}
            {notice && <div className="form-alert success-alert" role="status">{notice}</div>}
            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} required />
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? "Un momento…" : "Entrar a mi cuenta"}
              </button>
            </form>
            <p className="auth-switch" role="status">El registro de nuevas cuentas está temporalmente deshabilitado. No se crearán cuentas desde esta pantalla.</p>
            <p className="auth-security"><span aria-hidden="true">⌑</span> Sesiones protegidas con cookies seguras. No compartas tu contraseña.</p>
            <p className="auth-setup-note">El acceso necesita que la API esté configurada. No se crean cuentas de demostración ni se guardan datos localmente.</p>
          </div>
        </section>
      </main>
    );
  }

  const user = session.user;
  const organization = session.organizations[0];

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Micro app, inicio">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span><strong>micro app</strong><small>GESTIÓN COMERCIAL</small></span>
        </a>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <div className="workspace">
          <span className="workspace-avatar" aria-hidden="true">{organization?.name.slice(0, 1).toUpperCase() ?? "M"}</span>
          <span><strong>{organization?.name ?? "Mi negocio"}</strong><small>{organization?.role ?? "Miembro"}</small></span>
        </div>
        <nav className="side-nav">
          <a className="nav-item active" href="#inicio" aria-current="page"><span className="nav-symbol" aria-hidden="true">⌂</span> Resumen</a>
          {["Caja y ventas", "Inventario", "Productos", "Reportes"].map((label) => <span className="nav-item disabled" aria-disabled="true" key={label}><span className="nav-symbol" aria-hidden="true">▦</span>{label}<span className="nav-lock">Pronto</span></span>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-indicator"><span className="connection-dot" aria-hidden="true" /><span><strong>Sesión activa</strong><small>{user.email}</small></span></div>
          <button className="logout-button" type="button" onClick={handleLogout} disabled={busy}>Cerrar sesión</button>
          <small className="sidebar-version">MICRO APP · VERSIÓN INICIAL</small>
        </div>
      </aside>
      <section className="main-panel" id="inicio">
        <header className="topbar"><div className="breadcrumb">{organization?.name ?? "Mi negocio"} <span>/</span> Resumen</div><div className="account-chip"><span aria-hidden="true">{user.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.email}</small></div></div></header>
        <div className="page-content">
          {error && <div className="form-alert error-alert dashboard-alert" role="alert">{error}</div>}
          {notice && <div className="form-alert success-alert dashboard-alert" role="status">{notice}</div>}
          <section className="welcome"><div><p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p><h1>Hola, {user.display_name.split(" ")[0]}.</h1><p className="welcome-copy">Tu espacio de trabajo ya está listo. Estamos preparando las herramientas para gestionar tus ventas, controlar el inventario y consultar precios en USD y VES.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card"><span className="art-card-label">MICRO APP</span><span className="art-card-line" /><span className="art-card-line short" /><span className="art-card-foot">GESTIÓN · CONTROL · CLARIDAD</span></div></div></section>
          <section className="setup-banner"><div className="setup-icon" aria-hidden="true">↗</div><div className="setup-text"><h2>Cuenta conectada</h2><p>Tu sesión está activa. Las funciones de ventas e inventario se habilitarán en próximas fases.</p></div><span className="setup-status">Acceso seguro</span></section>
          <section className="modules-section" aria-labelledby="modules-title"><div className="section-heading"><div><p className="eyebrow">MÓDULOS DEL SISTEMA</p><h2 id="modules-title">Lo que estamos preparando</h2></div><span className="module-count">04 módulos previstos</span></div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.number}><div className="module-card-top"><span className="module-number">{module.number}</span><span className="module-indicator" aria-hidden="true">↗</span></div><h3>{module.title}</h3><p>{module.description}</p><div className="module-card-bottom"><span className="module-status-dot" aria-hidden="true" /><span>{module.status}</span></div></article>)}</div></section>
          <footer className="main-footer"><span>Micro app · Punto de venta e inventario</span><span>Sin servicios de pago obligatorios</span></footer>
        </div>
      </section>
    </main>
  );
}
