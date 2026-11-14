import { useEffect, useState } from "react";
import { apiRequest, ApiError, googleLoginUrl, type AuthResponse } from "./auth";
import "./auth.css";
import CatalogPanel from "./CatalogPanel";
import InventoryPanel from "./InventoryPanel";
import RegisterShiftsPanel from "./RegisterShiftsPanel";
import OrganizationStructurePanel from "./OrganizationStructurePanel";

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
  { number: "01", title: "Caja y ventas", description: "Turnos de caja disponibles; ventas y cobros en preparación.", status: "Disponible · apertura y cierre de turnos" },
  { number: "02", title: "Inventario", description: "Consulta, recepción de mercancía y conteos físicos por sucursal y almacén.", status: "Disponible · operaciones según permisos" },
  { number: "03", title: "Productos", description: "Catálogo y precios exactos en USD.", status: "Disponible · catálogo en USD" },
  { number: "04", title: "Tasa BCV", description: "Conversión a VES con fuente y fecha verificables.", status: "Disponible · fuente oficial" },
];

// Shown after a failed GET /auth/google/callback redirect (see apps/api/src/google-auth.ts).
// Keep these in sync with the ?auth_error= values that endpoint can set.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  not_allowlisted: "Tu cuenta de Google no está autorizada todavía. Comunícate con el administrador del sistema para que agregue tu correo a la lista de acceso.",
  account_inactive: "Tu cuenta existe pero está inactiva o sin un negocio asignado. Comunícate con el administrador del sistema.",
  identity_mismatch: "Esta cuenta de Google no coincide con la que estaba vinculada a ese correo. Comunícate con el administrador del sistema.",
  account_link_required: "Esta cuenta ya existe, pero no tiene una identidad de Google vinculada. Por seguridad, comunícate con el administrador para revisar el acceso.",
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

type BcvRateResponse = {
  rate: string;
  effectiveDate: string;
  fetchedAt: string;
  source: string;
  status: "current" | "stale";
};

type BcvSyncStateResponse = {
  source: string;
  health: "succeeded" | "failed" | "running" | "attention";
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastOutcome: string | null;
  lastErrorCode: string | null;
  lastEffectiveDate: string | null;
  updatedAt: string;
  attemptAgeSeconds: number | null;
};

function formatBcvSyncTimestamp(value: string | null): string {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas",
  }).format(new Date(value));
}

function formatBcvAttemptAge(value: number | null): string {
  if (value === null) return "Sin intentos";
  if (value < 60) return `${value} s`;
  const minutes = Math.floor(value / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

// Keep the official decimal string intact; never convert exchange rates to JS floats.
function formatBcvRate(value: string): string {
  const [integerPart = "0", fractionalPart] = value.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fractionalPart ? `${grouped},${fractionalPart}` : grouped;
}

function formatBcvEffectiveDate(value: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Caracas",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatBcvFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas",
  }).format(new Date(value));
}

function caracasCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}


function BcvSyncAdminPanel({ organizationId }: { organizationId: string }) {
  const [state, setState] = useState<BcvSyncStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    const refresh = async () => {
      const sequence = ++requestSequence;
      setLoading(true);
      try {
        const result = await apiRequest<BcvSyncStateResponse>(
          `/api/orgs/${encodeURIComponent(organizationId)}/bcv/sync-state`,
        );
        if (!active || sequence !== requestSequence) return;
        setState(result);
        setError("");
      } catch {
        if (!active || sequence !== requestSequence) return;
        setError("No se pudo consultar el estado operativo BCV. Inténtalo nuevamente.");
      } finally {
        if (active && sequence === requestSequence) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 300_000);
    return () => {
      active = false;
      requestSequence += 1;
      window.clearInterval(interval);
    };
  }, [organizationId, refreshVersion]);

  const healthLabel = state?.health === "succeeded"
    ? "Sincronización exitosa"
    : state?.health === "failed"
      ? "Último intento fallido"
      : state?.health === "running"
        ? "Sincronización en curso"
        : "Requiere atención";

  return (
    <section className="bcv-admin-panel" aria-live="polite" aria-label="Estado operativo de sincronización BCV">
      <div className="bcv-admin-heading">
        <div>
          <p className="eyebrow">CONTROL ADMINISTRATIVO</p>
          <h2>Sincronización BCV</h2>
          <p>Estado técnico de la última consulta a la fuente oficial. Esta sección es de solo lectura.</p>
        </div>
        <button type="button" className="bcv-refresh-button" onClick={() => setRefreshVersion((value) => value + 1)} disabled={loading}>
          {loading ? "Consultando…" : "Actualizar"}
        </button>
      </div>
      {error && <p className="bcv-admin-error" role="alert">{error}</p>}
      {state && (
        <>
          <div className="bcv-admin-status-row">
            <span className={`bcv-admin-status ${state.health}`}>{healthLabel}</span>
            <span className="bcv-admin-outcome">Resultado: {state.lastOutcome ?? "sin intentos"}</span>
          </div>
          <dl className="bcv-admin-grid">
            <div><dt>Último intento</dt><dd>{formatBcvSyncTimestamp(state.lastAttemptAt)}</dd></div>
            <div><dt>Último éxito</dt><dd>{formatBcvSyncTimestamp(state.lastSuccessAt)}</dd></div>
            <div><dt>Fecha efectiva reportada</dt><dd>{state.lastEffectiveDate ?? "Sin registro"}</dd></div>
            <div><dt>Tiempo desde el intento</dt><dd>{formatBcvAttemptAge(state.attemptAgeSeconds)}</dd></div>
          </dl>
          {state.lastErrorCode && <p className="bcv-admin-error-code">Código del último error: <code>{state.lastErrorCode}</code></p>}
        </>
      )}
      {!state && !error && <p className="bcv-admin-loading">{loading ? "Cargando estado…" : "No hay estado disponible."}</p>}
      <p className="bcv-admin-footnote">Un estado fallido o en curso no autoriza utilizar una tasa anterior ni habilita el checkout.</p>
    </section>
  );
}

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
  const [activeView, setActiveView] = useState<"overview" | "catalog" | "inventory" | "register-shifts" | "organization-structure">("overview");
  const [bcvRate, setBcvRate] = useState<BcvRateResponse | null>(null);
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvError, setBcvError] = useState("");

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

  useEffect(() => {
    if (!session) return;
    let active = true;
    let requestSequence = 0;
    let observedCaracasDate = caracasCalendarDate();
    const refreshBcvRate = () => {
      const sequence = ++requestSequence;
      const requestedDate = caracasCalendarDate();
      setBcvLoading(true);
      apiRequest<BcvRateResponse>("/api/exchange-rates/latest")
        .then((result) => {
          if (!active || sequence !== requestSequence) return;
          const responseDate = caracasCalendarDate();
          if (responseDate !== requestedDate) {
            observedCaracasDate = responseDate;
            setBcvError("La fecha cambió; verificando la tasa BCV aplicable.");
            refreshBcvRate();
            return;
          }
          setBcvRate(result);
          setBcvError("");
        })
        .catch((reason: unknown) => {
          if (!active || sequence !== requestSequence) return;
          setBcvError(reason instanceof Error ? reason.message : "No se pudo actualizar la tasa BCV.");
        })
        .finally(() => {
          if (active && sequence === requestSequence) setBcvLoading(false);
        });
    };
    refreshBcvRate();
    // A Friday rate stops being applicable at Caracas midnight on Saturday.
    // Revalidate on every local-date change and when the tab becomes visible.
    const dateInterval = window.setInterval(() => {
      const currentDate = caracasCalendarDate();
      if (currentDate === observedCaracasDate) return;
      observedCaracasDate = currentDate;
      setBcvError("La fecha cambió; verificando la tasa BCV aplicable.");
      refreshBcvRate();
    }, 60 * 1000);
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") refreshBcvRate();
    };
    document.addEventListener("visibilitychange", refreshOnVisibility);
    // Keep a periodic refresh for an open dashboard while also handling midnight exactly.
    const interval = window.setInterval(refreshBcvRate, 60 * 60 * 1000);
    return () => {
      active = false;
      requestSequence += 1;
      window.clearInterval(dateInterval);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [session]);

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
      setSession(null);
      setBcvRate(null);
      setBcvError("");
      setActiveView("overview");
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
          <a className={`nav-item ${activeView === "overview" ? "active" : ""}`} href="#inicio" onClick={() => setActiveView("overview")} aria-current={activeView === "overview" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">⌂</span> Resumen</a>
          <button className={`nav-item nav-item-button ${activeView === "catalog" ? "active" : ""}`} type="button" onClick={() => setActiveView("catalog")} aria-current={activeView === "catalog" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▦</span>Productos</button>
          <button className={`nav-item nav-item-button ${activeView === "inventory" ? "active" : ""}`} type="button" onClick={() => setActiveView("inventory")} aria-current={activeView === "inventory" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▤</span>Inventario</button>
          {(organization?.role === "owner" || organization?.role === "admin" || organization?.role === "cashier") ? (<button className={`nav-item nav-item-button ${activeView === "register-shifts" ? "active" : ""}`} type="button" onClick={() => setActiveView("register-shifts")} aria-current={activeView === "register-shifts" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▣</span>Caja y turnos</button>) : (<span className="nav-item disabled" aria-disabled="true"><span className="nav-symbol" aria-hidden="true">▣</span>Caja y turnos<span className="nav-lock">Sin acceso</span></span>)}
          {organization?.role === "owner" && <button className={`nav-item nav-item-button ${activeView === "organization-structure" ? "active" : ""}`} type="button" onClick={() => setActiveView("organization-structure")} aria-current={activeView === "organization-structure" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">⚙</span> Estructura</button>}
          {["Reportes"].map((label) => <span className="nav-item disabled" aria-disabled="true" key={label}><span className="nav-symbol" aria-hidden="true">▦</span>{label}<span className="nav-lock">Pronto</span></span>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-indicator"><span className="connection-dot" aria-hidden="true" /><span><strong>Sesión activa</strong><small>{user.email}</small></span></div>
          <button className="logout-button" type="button" onClick={handleLogout} disabled={busy}>Cerrar sesión</button>
          <small className="sidebar-version">MICRO APP · VERSIÓN INICIAL</small>
        </div>
      </aside>
      <section className="main-panel" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">{organization?.name ?? "Mi negocio"} <span>/</span> {activeView === "catalog" ? "Productos" : activeView === "inventory" ? "Inventario" : activeView === "register-shifts" ? "Caja y turnos" : activeView === "organization-structure" ? "Estructura organizacional" : "Resumen"}</div>
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
          {activeView === "overview" ? (
          <>
          <section className="welcome"><div><p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p><h1>Hola, {user.display_name.split(" ")[0]}.</h1><p className="welcome-copy">Tu espacio de trabajo ya está listo. El catálogo y la consulta de existencias por sucursal están disponibles; seguimos preparando las operaciones de venta y los movimientos de inventario.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card"><span className="art-card-label">MICRO APP</span><span className="art-card-line" /><span className="art-card-line short" /><span className="art-card-foot">GESTIÓN · CONTROL · CLARIDAD</span></div></div></section>
          <section className="setup-banner"><div className="setup-icon" aria-hidden="true">↗</div><div className="setup-text"><h2>Cuenta conectada</h2><p>Tu sesión está activa. Ya puedes consultar existencias por sucursal y almacén; las operaciones de venta y los movimientos de inventario siguen en preparación.</p></div><span className="setup-status">Acceso seguro</span></section>
          <section className="exchange-rate-panel" aria-live="polite" aria-label="Tasa oficial del Banco Central de Venezuela">
            <div className="exchange-rate-main">
              <p className="eyebrow">TIPO DE CAMBIO OFICIAL</p>
              <h2>{bcvRate ? <>1 USD <span>=</span> Bs. {formatBcvRate(bcvRate.rate)}</> : "Tasa BCV no disponible"}</h2>
              <p className="exchange-rate-meta">
                {bcvRate ? `Fecha valor: ${formatBcvEffectiveDate(bcvRate.effectiveDate)} · Actualizada: ${formatBcvFetchedAt(bcvRate.fetchedAt)}` : "La equivalencia en bolívares aparecerá cuando exista una tasa oficial validada."}
              </p>
              {bcvError && <p className="exchange-rate-error" role="status">{bcvError}</p>}
            </div>
            <span className={`exchange-rate-status ${bcvRate && (bcvError || bcvRate.status === "stale") ? "stale" : !bcvRate ? "unavailable" : ""}`}>
              {bcvLoading ? "Actualizando…" : bcvError && bcvRate ? "Sin actualizar" : bcvRate?.status === "current" ? "Vigente" : bcvRate?.status === "stale" ? "Desactualizada" : "No disponible"}
            </span>
            <p className="exchange-rate-source">Fuente: Banco Central de Venezuela (BCV). No se sustituye por tasas de terceros.</p>
          </section>
          {(organization?.role === "owner" || organization?.role === "admin") && (
            <BcvSyncAdminPanel organizationId={organization.id} />
          )}
          <section className="modules-section" aria-labelledby="modules-title"><div className="section-heading"><div><p className="eyebrow">MÓDULOS DEL SISTEMA</p><h2>Herramientas de tu negocio</h2></div><span className="module-count">04 módulos previstos</span></div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.number}><div className="module-card-top"><span className="module-number">{module.number}</span><span className="module-indicator" aria-hidden="true">↗</span></div><h3>{module.title}</h3><p>{module.description}</p><div className="module-card-bottom"><span className="module-status-dot" aria-hidden="true" /><span>{module.status}</span></div></article>)}</div></section>
          <footer className="main-footer">
            <div className="main-footer-row">
              <span>Micro app · Punto de venta e inventario</span>
              <span>Sin servicios de pago obligatorios</span>
            </div>
            <HelpLinks onOpen={setHelpModal} />
          </footer>
          </>
          ) : activeView === "inventory" ? (
            <InventoryPanel organizationId={organization?.id ?? ""} canManageInventory={organization?.role === "owner" || organization?.role === "admin" || organization?.role === "inventory"} />
          ) : activeView === "catalog" ? (
            <CatalogPanel
              organizationId={organization?.id ?? ""}
              exchangeRate={bcvRate?.rate ?? null}
              exchangeRateStatus={bcvRate ? (bcvError ? "stale" : bcvRate.status) : "unavailable"}
              canManage={organization?.role === "owner" || organization?.role === "admin"}
            />
          ) : activeView === "organization-structure" && organization?.role === "owner" ? (
            <OrganizationStructurePanel organizationId={organization.id} />
          ) : (
            <RegisterShiftsPanel organizationId={organization?.id ?? ""} userName={user.display_name} />
          )}
        </div>
      </section>
    </main>
    {helpModal && <HelpModal kind={helpModal} onClose={() => setHelpModal(null)} />}
    </>
  );
}
