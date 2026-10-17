import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiError, type AuthResponse } from "./auth";
import "./auth.css";

const modules = [
  { number: "01", title: "Caja y ventas", description: "Flujo de venta, cobro y comprobante.", status: "Pendiente de implementación" },
  { number: "02", title: "Inventario", description: "Existencias, movimientos y alertas de stock.", status: "Pendiente de implementación" },
  { number: "03", title: "Productos", description: "Catálogo, costos y precios en USD.", status: "Pendiente de implementación" },
  { number: "04", title: "Tasa BCV", description: "Conversión a VES con fuente y fecha verificables.", status: "Pendiente de integración" },
];

type Mode = "login" | "register";

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organizationName, setOrganizationName] = useState("");

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
      const result = await apiRequest<AuthResponse>(
        mode === "register" ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(mode === "register"
            ? { email, password, displayName, organizationName }
            : { email, password }),
        },
      );
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
      setMode("login");
      setNotice("Has cerrado la sesión de forma segura.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return <main className="auth-loading" aria-live="polite"><span className="brand-mark">m</span><p>Comprobando tu sesión…</p></main>;
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
            <div className="auth-mobile-brand"><span className="brand-mark">m</span><strong>micro app</strong></div>
            <p className="eyebrow auth-eyebrow">{mode === "login" ? "QUÉ BUENO TENERTE DE VUELTA" : "TU NEGOCIO, TU ESPACIO"}</p>
            <h2>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>
            <p className="auth-subtitle">{mode === "login" ? "Ingresa tus datos para continuar con tu negocio." : "Configura tu usuario y el espacio de trabajo inicial."}</p>
            {error && <div className="form-alert error-alert" role="alert">{error}</div>}
            {notice && <div className="form-alert success-alert" role="status">{notice}</div>}
            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "register" && <>
                <label htmlFor="displayName">Tu nombre</label>
                <input id="displayName" name="displayName" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required />
                <label htmlFor="organizationName">Nombre del negocio</label>
                <input id="organizationName" name="organizationName" autoComplete="organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} minLength={2} maxLength={120} required />
              </>}
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 12 : undefined} maxLength={128} required />
              {mode === "register" && <p className="field-hint">Usa al menos 12 caracteres. Evita reutilizar una contraseña de otro servicio.</p>}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? "Un momento…" : mode === "login" ? "Entrar a mi cuenta" : "Crear cuenta"}
              </button>
            </form>
            <p className="auth-switch">
              {mode === "login" ? "¿Todavía no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
              <button type="button" className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); }}>
                {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
              </button>
            </p>
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
        <header className="topbar"><div className="breadcrumb">{organization?.name ?? "Mi negocio"} <span>/</span> Resumen</div><div className="account-chip"><span>{user.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.email}</small></div></div></header>
        <div className="page-content">
          {error && <div className="form-alert error-alert dashboard-alert" role="alert">{error}</div>}
          <section className="welcome"><div><p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p><h1>Hola, {user.display_name.split(" ")[0]}.</h1><p className="welcome-copy">Tu espacio de trabajo ya está listo. Estamos preparando las herramientas para gestionar tus ventas, controlar el inventario y consultar precios en USD y VES.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card"><span className="art-card-label">MICRO APP</span><span className="art-card-line" /><span className="art-card-line short" /><span className="art-card-foot">GESTIÓN · CONTROL · CLARIDAD</span></div></div></section>
          <section className="setup-banner"><div className="setup-icon" aria-hidden="true">↗</div><div className="setup-text"><h2>Cuenta conectada</h2><p>Tu sesión está activa. Las funciones de ventas e inventario se habilitarán en próximas fases.</p></div><span className="setup-status">Acceso seguro</span></section>
          <section className="modules-section" aria-labelledby="modules-title"><div className="section-heading"><div><p className="eyebrow">MÓDULOS DEL SISTEMA</p><h2>Lo que estamos preparando</h2></div><span className="module-count">04 módulos previstos</span></div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.number}><div className="module-card-top"><span className="module-number">{module.number}</span><span className="module-indicator" aria-hidden="true">↗</span></div><h3>{module.title}</h3><p>{module.description}</p><div className="module-card-bottom"><span className="module-status-dot" aria-hidden="true" /><span>{module.status}</span></div></article>)}</div></section>
          <footer className="main-footer"><span>Micro app · Punto de venta e inventario</span><span>Sin servicios de pago obligatorios</span></footer>
        </div>
      </section>
    </main>
  );
}
