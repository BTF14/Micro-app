import { useEffect, useState } from "react";
import { apiRequest, ApiError, googleLoginUrl, type AuthResponse } from "./auth";
import "./auth.css";

// WhatsApp number format (no "+", no spaces) per https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat.
function whatsappUrl(message: string): string {
  return `https://wa.me/584243104520?text=${encodeURIComponent(message)}`;
}
const ADMIN_WHATSAPP_URL = whatsappUrl("Hola, necesito acceso a Micro app.");
const SUPPORT_WHATSAPP_URL = whatsappUrl("Hola, tuve un problema usando Micro app.");

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "¿Qué es Micro app?",
    answer: "Es el sistema interno de gestión comercial de tu negocio: inventario, ventas y precios en dólares con conversión a bolívares según la tasa del BCV. Varias partes todavía están en construcción.",
  },
  {
    question: "¿Quién puede entrar?",
    answer: "Solo las cuentas de Google que el administrador haya autorizado de forma explícita. No existen cuentas de demostración ni registro abierto.",
  },
  {
    question: "¿Por qué no hay usuario y contraseña?",
    answer: "El acceso es únicamente con tu cuenta de Google autorizada; es más seguro y no tienes que recordar otra contraseña. Si no puedes entrar, contacta al administrador por WhatsApp.",
  },
  {
    question: "Encontré un error o algo no funciona, ¿qué hago?",
    answer: "Escríbenos por WhatsApp contando qué intentabas hacer y, si puedes, una captura de pantalla. Lo revisamos lo antes posible.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer: "Revisa el apartado de Privacidad más abajo para ver qué datos se guardan y cómo se usan.",
  },
];

const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Qué datos guardamos",
    body: "Tu nombre y correo de la cuenta de Google con la que inicias sesión, y la información del negocio que se registre en el sistema (por ejemplo, inventario y ventas, a medida que esas funciones se habiliten).",
  },
  {
    heading: "Para qué los usamos",
    body: "Únicamente para darte acceso al sistema y operar la gestión comercial de tu negocio. No se usan con fines publicitarios ni de análisis externo.",
  },
  {
    heading: "Con quién se comparten",
    body: "Con nadie fuera de las personas que el administrador autorice dentro de tu propio negocio. No se venden ni se comparten con terceros.",
  },
  {
    heading: "Dónde se guardan",
    body: "En infraestructura administrada (base de datos Neon y Cloudflare), con conexión cifrada. El acceso a la base de datos está restringido al administrador técnico del sistema.",
  },
  {
    heading: "Tus derechos",
    body: "Puedes pedir que se corrija o elimine tu información escribiendo al administrador por WhatsApp.",
  },
  {
    heading: "Nota",
    body: "Este es un aviso de privacidad básico para una aplicación interna todavía en desarrollo. Si el negocio empieza a manejar datos de clientes o el sistema se abre al público, conviene una revisión legal formal antes de ese paso.",
  },
];

const modules = [
  { number: "01", title: "Caja y ventas", description: "Flujo de venta, cobro y comprobante.", status: "Pendiente de implementación" },
  { number: "02", title: "Inventario", description: "Existencias, movimientos y alertas de stock.", status: "Pendiente de implementación" },
  { number: "03", title: "Productos", description: "Catálogo, costos y precios en USD.", status: "Pendiente de implementación" },
  { number: "04", title: "Tasa BCV", description: "Conversión a VES con fuente y fecha verificables.", status: "Pendiente de integración" },
];

// Shown after a failed GET /auth/google/callback redirect (see apps/api/src/google-auth.ts).
// Keep these in sync with the ?auth_error= values that endpoint can set.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  not_allowlisted: "Tu cuenta de Google no está autorizada todavía. Comunícate con el administrador del sistema para que agregue tu correo a la lista de acceso.",
  account_inactive: "Tu cuenta existe pero está inactiva o sin un negocio asignado. Comunícate con el administrador del sistema.",
  identity_mismatch: "Esta cuenta de Google no coincide con la que estaba vinculada a ese correo. Comunícate con el administrador del sistema.",
  bootstrap_consumed: "El enlace de configuración inicial ya fue usado. Si necesitas acceso, comunícate con el administrador del sistema.",
  not_provisioned: "No existe una cuenta para este correo todavía. Comunícate con el administrador del sistema.",
  email_not_verified: "Tu cuenta de Google no tiene el correo verificado, así que no podemos continuar. Verifica tu correo con Google e inténtalo de nuevo.",
  oauth_failed: "No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.",
  server_error: "Ocurrió un problema en el servidor al iniciar sesión. Inténtalo de nuevo en unos minutos.",
};

function readAuthErrorFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("auth_error");
  if (!code) return "";
  // Remove it from the address bar so a refresh doesn't keep re-showing it.
  params.delete("auth_error");
  const query = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  return AUTH_ERROR_MESSAGES[code] ?? "No se pudo iniciar sesión. Comunícate con el administrador del sistema.";
}

type HelpModalKind = "faq" | "privacy";

function HelpLinks({ onOpen }: { onOpen: (kind: HelpModalKind) => void }) {
  return (
    <p className="help-links">
      <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>
      <span aria-hidden="true">·</span>
      <button type="button" className="text-button" onClick={() => onOpen("faq")}>Preguntas frecuentes</button>
      <span aria-hidden="true">·</span>
      <button type="button" className="text-button" onClick={() => onOpen("privacy")}>Privacidad</button>
    </p>
  );
}

function HelpModal({ kind, onClose }: { kind: HelpModalKind; onClose: () => void }) {
  return (
    <div className="help-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-label={kind === "faq" ? "Preguntas frecuentes" : "Política de privacidad"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="help-modal-head">
          <h2>{kind === "faq" ? "Preguntas frecuentes" : "Privacidad"}</h2>
          <button type="button" className="help-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="help-modal-body">
          {kind === "faq"
            ? FAQ_ITEMS.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))
            : PRIVACY_SECTIONS.map((section) => (
                <div className="help-modal-section" key={section.heading}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                </div>
              ))}
          <p className="help-modal-foot">
            ¿Más dudas? <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => readAuthErrorFromUrl());
  const [notice, setNotice] = useState("");
  const [helpModal, setHelpModal] = useState<HelpModalKind | null>(null);

  useEffect(() => {
    let active = true;
    if (__MICRO_APP_IS_PREVIEW__) {
      setCheckingSession(false);
      return () => { active = false; };
    }
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
    return <main className="auth-loading" aria-live="polite"><span className="brand-mark">m</span><p>Comprobando tu sesión…</p></main>;
  }

  if (!session) {
    return (
      <>
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
            <p className="eyebrow auth-eyebrow">QUÉ BUENO TENERTE DE VUELTA</p>
            <h2>Inicia sesión</h2>
            <p className="auth-subtitle">Accede con la cuenta de Google autorizada para tu negocio.</p>
            {error && (
              <div className="form-alert error-alert" role="alert">
                {error}{" "}
                <a href={ADMIN_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Escríbele por WhatsApp</a>.
              </div>
            )}
            {notice && <div className="form-alert success-alert" role="status">{notice}</div>}
            {__MICRO_APP_IS_PREVIEW__ ? (
              <div className="form-alert" role="status">
                Vista previa aislada: el inicio de sesión y el acceso a datos están deshabilitados para proteger producción.
              </div>
            ) : (
              <a className="auth-submit google-submit" href={googleLoginUrl()}>Continuar con Google</a>
            )}
            <p className="auth-security"><span aria-hidden="true">⌑</span> Sesiones protegidas con cookies seguras. El acceso solo se concede a correos autorizados por el administrador.</p>
            <p className="auth-setup-note">
              ¿Tu cuenta no está autorizada?{" "}
              <a href={ADMIN_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Escríbele al administrador por WhatsApp</a> para solicitar acceso.
            </p>
            <HelpLinks onOpen={setHelpModal} />
          </div>
        </section>
      </main>
      {helpModal && <HelpModal kind={helpModal} onClose={() => setHelpModal(null)} />}
    </>
    );
  }

  const user = session.user;
  const organization = session.organizations[0];

  return (
    <>
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
        <header className="topbar">
          <div className="breadcrumb">{organization?.name ?? "Mi negocio"} <span>/</span> Resumen</div>
          <div className="topbar-end">
            <div className="account-chip"><span>{user.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.email}</small></div></div>
            {/* The sidebar's own logout button (.sidebar-bottom) is hidden on narrow screens
                (see styles.css), so this is the only way to log out on mobile. */}
            <button className="topbar-logout" type="button" onClick={handleLogout} disabled={busy}>Cerrar sesión</button>
          </div>
        </header>
        <div className="page-content">
          {error && (
            <div className="form-alert error-alert dashboard-alert" role="alert">
              {error}{" "}
              <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.
            </div>
          )}
          <section className="welcome"><div><p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p><h1>Hola, {user.display_name.split(" ")[0]}.</h1><p className="welcome-copy">Tu espacio de trabajo ya está listo. Estamos preparando las herramientas para gestionar tus ventas, controlar el inventario y consultar precios en USD y VES.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card"><span className="art-card-label">MICRO APP</span><span className="art-card-line" /><span className="art-card-line short" /><span className="art-card-foot">GESTIÓN · CONTROL · CLARIDAD</span></div></div></section>
          <section className="setup-banner"><div className="setup-icon" aria-hidden="true">↗</div><div className="setup-text"><h2>Cuenta conectada</h2><p>Tu sesión está activa. Las funciones de ventas e inventario se habilitarán en próximas fases.</p></div><span className="setup-status">Acceso seguro</span></section>
          <section className="modules-section" aria-labelledby="modules-title"><div className="section-heading"><div><p className="eyebrow">MÓDULOS DEL SISTEMA</p><h2>Lo que estamos preparando</h2></div><span className="module-count">04 módulos previstos</span></div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.number}><div className="module-card-top"><span className="module-number">{module.number}</span><span className="module-indicator" aria-hidden="true">↗</span></div><h3>{module.title}</h3><p>{module.description}</p><div className="module-card-bottom"><span className="module-status-dot" aria-hidden="true" /><span>{module.status}</span></div></article>)}</div></section>
          <footer className="main-footer">
            <div className="main-footer-row">
              <span>Micro app · Punto de venta e inventario</span>
              <span>Sin servicios de pago obligatorios</span>
            </div>
            <HelpLinks onOpen={setHelpModal} />
          </footer>
        </div>
      </section>
    </main>
    {helpModal && <HelpModal kind={helpModal} onClose={() => setHelpModal(null)} />}
    </>
  );
}
