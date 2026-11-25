import { useEffect, useRef, useState } from "react";
import { apiRequest, ApiError, googleLoginUrl, type AuthResponse } from "./auth";
import { formatLocalizedDecimal } from "./decimal";
import "./auth.css";
import CatalogPanel from "./CatalogPanel";
import InventoryPanel from "./InventoryPanel";
import QuickProductLookup from "./QuickProductLookup";
import RegisterShiftsPanel from "./RegisterShiftsPanel";
import SalesPanel from "./SalesPanel";
import OrganizationStructurePanel from "./OrganizationStructurePanel";
import FxContingencyPanel from "./FxContingencyPanel";
import ReportsPanel from "./ReportsPanel";

// WhatsApp number format (no "+", no spaces) per https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat.
function whatsappUrl(message: string): string {
  return `https://wa.me/584243104520?text=${encodeURIComponent(message)}`;
}
const ACTIVE_VIEW_STORAGE_KEY = "micro-app:active-view";
function readStoredView(): WorkspaceView | null { try { const value = window.sessionStorage.getItem(ACTIVE_VIEW_STORAGE_KEY); return value && Object.prototype.hasOwnProperty.call(VIEW_HASHES, value) ? value as WorkspaceView : null; } catch { return null; } }
function writeStoredView(view: WorkspaceView) { try { window.sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, view); } catch { /* Storage may be unavailable. */ } }
function clearStoredView() { try { window.sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY); } catch { /* Storage may be unavailable. */ } }
const ADMIN_WHATSAPP_URL = whatsappUrl("Hola, necesito acceso a Micro app.");
const SUPPORT_WHATSAPP_URL = whatsappUrl("Hola, tuve un problema usando Micro app.");

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "¿Qué es Micro app?",
    answer: "Es el sistema interno de gestión comercial de tu negocio: inventario, ventas y precios en dólares con conversión a bolívares según la tasa del BCV.",
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
    body: "Tu nombre y correo de la cuenta de Google con la que inicias sesión, y la información del negocio que se registre en el sistema (catálogo, inventario, caja y ventas).",
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
    body: "Este es un aviso de privacidad básico para uso interno del negocio. Si el negocio empieza a manejar datos de clientes o el sistema se abre al público, conviene una revisión legal formal antes de ese paso.",
  },
];

const modules: { number: string; title: string; description: string; view: WorkspaceView; ariaLabel: string }[] = [
  { number: "01", title: "Ventas", description: "Registra ventas con la tasa BCV vigente y consulta cada operación.", view: "sales", ariaLabel: "Ventas: abrir punto de venta" },
  { number: "02", title: "Caja y turnos", description: "Abre turnos, gestiona cobros y revisa los cierres de caja.", view: "register-shifts", ariaLabel: "Caja y turnos: abrir caja" },
  { number: "03", title: "Inventario", description: "Controla existencias, recepciones y conteos por sucursal.", view: "inventory", ariaLabel: "Inventario: abrir existencias" },
  { number: "04", title: "Productos", description: "Administra el catálogo y consulta precios exactos en USD.", view: "catalog", ariaLabel: "Productos: abrir catálogo" },
  { number: "05", title: "Reportes", description: "Consulta ventas, movimientos y resultados de la operación.", view: "reports", ariaLabel: "Reportes: abrir informes" },
  { number: "06", title: "Gestión cambiaria", description: "Administra autorizaciones temporales de contingencia BCV.", view: "fx-contingency", ariaLabel: "Gestión cambiaria: abrir configuración cambiaria" },
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
type WorkspaceView = "overview" | "catalog" | "inventory" | "quick-lookup" | "register-shifts" | "sales" | "reports" | "organization-structure" | "fx-contingency";
const VIEW_HASHES: Record<WorkspaceView,string> = {overview:"resumen",catalog:"productos",inventory:"inventario","quick-lookup":"consultar-precio","register-shifts":"caja-turnos",sales:"ventas",reports:"reportes","organization-structure":"estructura","fx-contingency":"gestion-cambiaria"};
function viewFromHash(hash:string):WorkspaceView { const slug=hash.replace(/^#/,"").toLowerCase(); if(!slug||slug==="inicio"||slug==="resumen")return "overview"; return (Object.entries(VIEW_HASHES) as [WorkspaceView,string][]).find(([,value])=>value===slug)?.[0]??"overview"; }
function roleCanAccessView(role:string|undefined,view:WorkspaceView):boolean { if(view==="overview"||view==="catalog"||view==="inventory")return true; if(view==="quick-lookup"||view==="reports")return ["owner","admin","inventory","cashier"].includes(role??""); if(view==="register-shifts"||view==="sales")return ["owner","admin","cashier"].includes(role??""); if(view==="organization-structure")return role==="owner"; if(view==="fx-contingency")return role==="owner"||role==="admin"; return false; }

type BcvRateResponse = {
  rate: string;
  effectiveDate: string;
  fetchedAt: string;
  source: string;
  status: "current" | "scheduled" | "stale";
  operationDate?: string;
  selectionPriority?: "today_exact" | "weekend_prepublished" | "weekday_same_day_sync" | null;
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
  isStaleRunning: boolean;
  staleRunningThresholdSeconds: number;
};

function formatBcvOutcome(value: string | null): string {
  if (!value) return "sin intentos";
  const labels: Record<string, string> = {
    inserted: "insertada", unchanged: "sin cambios", skipped: "omitida",
    failed: "fallida", running: "en ejecución", older: "anterior descartada", superseded: "reemplazada",
  };
  return labels[value.toLowerCase()] ?? value.replace(/[_-]+/g, " ").toLowerCase();
}

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

// Keep the official rate exact and apply the shared es-VE decimal formatter.
function formatBcvRate(value: string): string {
  return formatLocalizedDecimal(value, 18, 8, 8);
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
            <span className="bcv-admin-outcome">Resultado: {formatBcvOutcome(state.lastOutcome)}</span>
          </div>
          {state.isStaleRunning && (
            <p className="bcv-admin-error" role="alert">
              La sincronización lleva al menos {Math.ceil(state.staleRunningThresholdSeconds / 60)} minutos atascada en ejecución. El checkout sigue bloqueado por seguridad hasta que se complete una sincronización válida.
            </p>
          )}
          <dl className="bcv-admin-grid">
            <div><dt>Último intento</dt><dd>{formatBcvSyncTimestamp(state.lastAttemptAt)}</dd></div>
            <div><dt>Último éxito</dt><dd>{formatBcvSyncTimestamp(state.lastSuccessAt)}</dd></div>
            <div><dt>Fecha efectiva reportada</dt><dd>{state.lastEffectiveDate ? formatBcvEffectiveDate(state.lastEffectiveDate) : "Sin registro"}</dd></div>
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    const handleDialogKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeydown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeydown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="help-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-label={kind === "faq" ? "Preguntas frecuentes" : "Política de privacidad"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="help-modal-head">
          <h2>{kind === "faq" ? "Preguntas frecuentes" : "Privacidad"}</h2>
          <button ref={closeButtonRef} type="button" className="help-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
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
  const [activeView, setActiveView] = useState<WorkspaceView>(() => viewFromHash(window.location.hash));
  function selectView(view: WorkspaceView) { const role = session?.organizations[0]?.role; const safeView = roleCanAccessView(role, view) ? view : "overview"; setActiveView(safeView); writeStoredView(safeView); const hash = `#${VIEW_HASHES[safeView]}`; if (window.location.hash !== hash) window.history.pushState({}, "", `${window.location.pathname}${window.location.search}${hash}`); }
  const [selectedReportShift, setSelectedReportShift] = useState<{ branchId: string; shiftId: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [bcvRate, setBcvRate] = useState<BcvRateResponse | null>(null);
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvError, setBcvError] = useState("");

  useEffect(() => {
    if (!session) return;
    const role = session.organizations[0]?.role;
    const restore = (hash: string, initial = false) => {
      const genericHash = hash === "" || hash === "#inicio";
      const requested = initial && genericHash ? (readStoredView() ?? "overview") : viewFromHash(hash);
      const next = roleCanAccessView(role, requested) ? requested : "overview";
      setActiveView(next);
      writeStoredView(next);
      if ((next !== requested || genericHash) && hash !== `#${VIEW_HASHES[next]}`) {
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${VIEW_HASHES[next]}`);
      }
    };
    restore(window.location.hash, true);
    const onHashChange = () => restore(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [session]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredView();
      try {
        for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
          const key = window.sessionStorage.key(index);
          if (key?.startsWith("micro-app:sales:draft:")) window.sessionStorage.removeItem(key);
        }
      } catch { /* Logout must still complete when session storage is unavailable. */ }
      setSession(null);
      setBcvRate(null);
      setBcvError("");
      setActiveView("overview");
      setNotice("");
      setError("Tu sesión expiró. Inicia sesión nuevamente.");
    };
    window.addEventListener("micro-app:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("micro-app:unauthorized", handleUnauthorized);
  }, []);

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
    window.addEventListener("focus", refreshBcvRate);
    // Keep a periodic refresh for an open dashboard while also handling midnight exactly.
    const interval = window.setInterval(refreshBcvRate, 60 * 60 * 1000);
    return () => {
      active = false;
      requestSequence += 1;
      window.clearInterval(dateInterval);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      window.removeEventListener("focus", refreshBcvRate);
    };
  }, [session]);

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
      clearStoredView();
      try {
        for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
          const key = window.sessionStorage.key(index);
          if (key?.startsWith("micro-app:sales:draft:")) window.sessionStorage.removeItem(key);
        }
      } catch { /* Logout must still complete when session storage is unavailable. */ }
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
          <a className="brand auth-brand" href="#resumen">
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
  const firstName = user.display_name.trim().split(/\s+/)[0] ?? "";
  const greetingName = firstName.includes("@") ? firstName.split("@")[0] : firstName;
  const role = organization?.role;
  const canManageCatalog = role === "owner" || role === "admin";
  const canManageInventory = role === "owner" || role === "admin" || role === "inventory";
  const visibleShortcuts = modules
    .filter((item) => roleCanAccessView(role, item.view))
    .map((item) => item.view === "inventory"
      ? { ...item, description: canManageInventory
        ? "Controla existencias, recepciones y conteos por sucursal."
        : "Consulta existencias y disponibilidad por sucursal." }
      : item.view === "catalog"
        ? { ...item, description: canManageCatalog
          ? "Administra el catálogo y consulta precios exactos en USD."
          : "Consulta el catálogo y precios exactos en USD." }
        : item);
  const renderedView: WorkspaceView = roleCanAccessView(organization?.role, activeView) ? activeView : "overview";

  return (
    <>
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <a className="brand" href="#resumen" aria-label="Micro app, inicio">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span><strong>micro app</strong><small>GESTIÓN COMERCIAL</small></span>
        </a>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <div className="workspace">
          <span className="workspace-avatar" aria-hidden="true">{organization?.name.slice(0, 1).toUpperCase() ?? "M"}</span>
          <span><strong>{organization?.name ?? "Mi negocio"}</strong><small>{organization?.role ?? "Miembro"}</small></span>
        </div>
        <button className="mobile-nav-toggle" type="button" aria-expanded={mobileNavOpen} aria-controls="primary-navigation" onClick={() => setMobileNavOpen((open) => !open)}><span aria-hidden="true">{mobileNavOpen ? "×" : "☰"}</span>{mobileNavOpen ? "Cerrar menú" : "Menú"}</button>
        <nav id="primary-navigation" className={`side-nav ${mobileNavOpen ? "open" : ""}`} onClick={() => setMobileNavOpen(false)}>
          <a className={`nav-item ${renderedView === "overview" ? "active" : ""}`} href="#resumen" onClick={() => selectView("overview")} aria-current={renderedView === "overview" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">⌂</span> Resumen</a>
          <button className={`nav-item nav-item-button ${renderedView === "catalog" ? "active" : ""}`} type="button" onClick={() => selectView("catalog")} aria-current={renderedView === "catalog" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▦</span>Productos</button>
          <button className={`nav-item nav-item-button ${renderedView === "inventory" ? "active" : ""}`} type="button" onClick={() => selectView("inventory")} aria-current={renderedView === "inventory" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▤</span>Inventario</button>
          {(organization?.role === "owner" || organization?.role === "admin" || organization?.role === "inventory" || organization?.role === "cashier") && <button className={`nav-item nav-item-button ${renderedView === "quick-lookup" ? "active" : ""}`} type="button" onClick={() => selectView("quick-lookup")} aria-current={renderedView === "quick-lookup" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">⌕</span>Consultar precio</button>}
          {(organization?.role === "owner" || organization?.role === "admin" || organization?.role === "cashier") ? (<button className={`nav-item nav-item-button ${renderedView === "register-shifts" ? "active" : ""}`} type="button" onClick={() => selectView("register-shifts")} aria-current={renderedView === "register-shifts" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▣</span>Caja y turnos</button>) : (<span className="nav-item disabled" aria-disabled="true"><span className="nav-symbol" aria-hidden="true">▣</span>Caja y turnos<span className="nav-lock">Sin acceso</span></span>)}
          {(organization?.role === "owner" || organization?.role === "admin" || organization?.role === "cashier") && <button className={`nav-item nav-item-button ${renderedView === "sales" ? "active" : ""}`} type="button" onClick={() => selectView("sales")} aria-current={renderedView === "sales" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">$</span>Ventas</button>}
          {organization?.role === "owner" && <button className={`nav-item nav-item-button ${renderedView === "organization-structure" ? "active" : ""}`} type="button" onClick={() => selectView("organization-structure")} aria-current={renderedView === "organization-structure" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">⚙</span> Estructura</button>}
          {(organization?.role === "owner" || organization?.role === "admin") && <button className={`nav-item nav-item-button ${renderedView === "fx-contingency" ? "active" : ""}`} type="button" onClick={() => selectView("fx-contingency")} aria-current={renderedView === "fx-contingency" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">₿</span> Gestión cambiaria</button>}
          {(organization?.role === "owner" || organization?.role === "admin" || organization?.role === "inventory" || organization?.role === "cashier") && <button className={`nav-item nav-item-button ${renderedView === "reports" ? "active" : ""}`} type="button" onClick={() => selectView("reports")} aria-current={renderedView === "reports" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">▦</span>Reportes</button>}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-indicator"><span className="connection-dot" aria-hidden="true" /><span><strong>Sesión activa</strong><small>{user.email}</small></span></div>
          <button className="logout-button" type="button" onClick={handleLogout} disabled={busy}>Cerrar sesión</button>
          <small className="sidebar-version">MICRO APP · VERSIÓN INICIAL</small>
        </div>
      </aside>
      <section className="main-panel" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">{organization?.name ?? "Mi negocio"} <span>/</span> {renderedView === "catalog" ? "Productos" : renderedView === "inventory" ? "Inventario" : renderedView === "quick-lookup" ? "Consultar precio" : renderedView === "register-shifts" ? "Caja y turnos" : renderedView === "sales" ? "Ventas" : renderedView === "organization-structure" ? "Estructura organizacional" : renderedView === "fx-contingency" ? "Gestión cambiaria" : renderedView === "reports" ? "Reportes" : "Resumen"}</div>
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
          {renderedView === "overview" ? (
          <>
          <section className="welcome"><div><p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p><h1>Hola, {greetingName}.</h1><p className="welcome-copy">Tu espacio de trabajo está listo para operar: administra el catálogo, controla el inventario por sucursal, gestiona la caja, registra ventas y consulta los reportes disponibles.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card"><span className="art-card-label">MICRO APP</span><span className="art-card-line" /><span className="art-card-line short" /><span className="art-card-foot">GESTIÓN · CONTROL · CLARIDAD</span></div></div></section>
          <section className="setup-banner"><div className="setup-icon" aria-hidden="true">↗</div><div className="setup-text"><h2>Cuenta conectada</h2><p>Tu sesión está activa. Desde aquí puedes gestionar el catálogo, inventario, caja y ventas, y dar seguimiento a la operación mediante los reportes disponibles.</p></div><span className="setup-status">Acceso seguro</span></section>
          <section className="exchange-rate-panel" aria-live="polite" aria-label="Tasa oficial del Banco Central de Venezuela">
            <div className="exchange-rate-main">
              <p className="eyebrow">TIPO DE CAMBIO OFICIAL</p>
              <h2>{bcvRate ? <>1 USD <span>=</span> Bs. {formatBcvRate(bcvRate.rate)}</> : "Tasa BCV no disponible"}</h2>
              <p className="exchange-rate-meta">
                {bcvRate ? `Fecha de operación: ${formatBcvEffectiveDate(bcvRate.operationDate ?? caracasCalendarDate())} · Fecha valor BCV: ${formatBcvEffectiveDate(bcvRate.effectiveDate)} · Capturada: ${formatBcvFetchedAt(bcvRate.fetchedAt)}` : "La equivalencia en bolívares aparecerá cuando exista una tasa oficial validada."}
              </p>
              {bcvError && <p className="exchange-rate-error" role="status">{bcvError}</p>}
            </div>
            <span className={`exchange-rate-status ${bcvRate && (bcvError || bcvRate.status === "stale") ? "stale" : !bcvRate ? "unavailable" : ""}`}>
              {bcvLoading ? "Actualizando…" : bcvError && bcvRate ? "Sin actualizar" : bcvRate?.status === "current" ? "Válida para hoy" : bcvRate?.status === "scheduled" ? "Publicada; aún no aplicable" : bcvRate?.status === "stale" ? "Desactualizada" : "No disponible"}
            </span>
            <p className="exchange-rate-source">Fuente: Banco Central de Venezuela (BCV). No se sustituye por tasas de terceros.</p>
          </section>
          {(organization?.role === "owner" || organization?.role === "admin") && (
            <BcvSyncAdminPanel organizationId={organization.id} />
          )}
          <section className="modules-section" aria-labelledby="modules-title"><div className="section-heading"><div><p className="eyebrow">MÓDULOS DEL SISTEMA</p><h2 id="modules-title">Herramientas de tu negocio</h2></div><span className="module-count">{visibleShortcuts.length} accesos disponibles</span></div><div className="module-grid">{visibleShortcuts.map((item) => <a className="module-card module-card-button" href={`#${VIEW_HASHES[item.view]}`} aria-label={item.ariaLabel} key={item.view} onClick={(event) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); selectView(item.view); }}><div className="module-card-top"><span className="module-number">{item.number}</span><span className="module-indicator" aria-hidden="true">↗</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="module-card-bottom"><span className="module-status-dot" aria-hidden="true" /><span>Acceso disponible</span></div></a>)}</div></section>
          <footer className="main-footer">
            <div className="main-footer-row">
              <span>Micro app · Punto de venta e inventario</span>
              <span>Sin servicios de pago obligatorios</span>
            </div>
            <HelpLinks onOpen={setHelpModal} />
          </footer>
          </>
          ) : renderedView === "inventory" ? (
            <InventoryPanel organizationId={organization?.id ?? ""} canManageInventory={organization?.role === "owner" || organization?.role === "admin" || organization?.role === "inventory"} />
          ) : renderedView === "quick-lookup" ? (
            <QuickProductLookup organizationId={organization?.id ?? ""} exchangeRate={bcvRate?.rate ?? null}
              exchangeRateStatus={bcvRate ? (bcvError ? "stale" : bcvRate.status) : "unavailable"}
              exchangeRateEffectiveDate={bcvRate?.effectiveDate ?? null} />
          ) : renderedView === "sales" && (organization?.role === "owner" || organization?.role === "admin" || organization?.role === "cashier") ? (
            <SalesPanel organizationId={organization.id} exchangeRate={bcvRate?.rate ?? null}
              exchangeRateStatus={bcvRate ? (bcvError ? "stale" : bcvRate.status) : "unavailable"}
              exchangeRateEffectiveDate={bcvRate?.effectiveDate ?? null}
              onGoToRegister={() => selectView("register-shifts")}
              onRefreshRate={async () => {
                try { const result = await apiRequest<BcvRateResponse>("/api/exchange-rates/latest"); setBcvRate(result); setBcvError(""); }
                catch (reason) { setBcvError(reason instanceof Error ? reason.message : "No se pudo actualizar la tasa BCV."); }
              }} />
          ) : renderedView === "reports" && organization ? (
            <ReportsPanel organizationId={organization.id} role={organization.role} initialShift={selectedReportShift} />
          ) : renderedView === "catalog" ? (
            <CatalogPanel
              organizationId={organization?.id ?? ""}
              exchangeRate={bcvRate?.rate ?? null}
              exchangeRateStatus={bcvRate ? (bcvError ? "stale" : bcvRate.status) : "unavailable"}
              exchangeRateEffectiveDate={bcvRate?.effectiveDate ?? null}
              canManage={organization?.role === "owner" || organization?.role === "admin"}
            />
          ) : renderedView === "fx-contingency" && (organization?.role === "owner" || organization?.role === "admin") ? (
            <FxContingencyPanel organizationId={organization.id} role={organization.role} />
          ) : renderedView === "organization-structure" && organization?.role === "owner" ? (
            <OrganizationStructurePanel organizationId={organization.id} />
          ) : renderedView === "register-shifts" && (organization?.role === "owner" || organization?.role === "admin" || organization?.role === "cashier") ? (
            <RegisterShiftsPanel organizationId={organization.id} userName={user.display_name} onOpenShiftClosure={(branchId, shiftId) => { setSelectedReportShift({ branchId, shiftId }); selectView("reports"); }} />
          ) : (
            <section className="welcome"><div><p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p><h1>Hola, {greetingName}.</h1><p className="welcome-copy">Tu espacio de trabajo está listo.</p></div></section>
          )}
        </div>
      </section>
    </main>
    {helpModal && <HelpModal kind={helpModal} onClose={() => setHelpModal(null)} />}
    </>
  );
}
