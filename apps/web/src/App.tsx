const modules = [
  {
    number: "01",
    title: "Caja y ventas",
    description: "Flujo de venta, cobro y comprobante.",
    status: "Pendiente de implementación",
  },
  {
    number: "02",
    title: "Inventario",
    description: "Existencias, movimientos y alertas de stock.",
    status: "Pendiente de implementación",
  },
  {
    number: "03",
    title: "Productos",
    description: "Catálogo, costos y precios en USD.",
    status: "Pendiente de implementación",
  },
  {
    number: "04",
    title: "Tasa BCV",
    description: "Conversión a VES con fuente y fecha verificables.",
    status: "Pendiente de integración",
  },
];

export default function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Micro app, inicio">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span>
            <strong>micro app</strong>
            <small>GESTIÓN COMERCIAL</small>
          </span>
        </a>

        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <div className="workspace">
          <span className="workspace-avatar" aria-hidden="true">M</span>
          <span>
            <strong>Mi negocio</strong>
            <small>Configuración inicial</small>
          </span>
          <span className="workspace-chevron" aria-hidden="true">⌄</span>
        </div>

        <nav className="side-nav">
          <a className="nav-item active" href="#inicio" aria-current="page">
            <span className="nav-symbol" aria-hidden="true">⌂</span> Resumen
          </a>
          <span className="nav-item disabled" aria-disabled="true">
            <span className="nav-symbol" aria-hidden="true">▤</span> Caja y ventas
            <span className="nav-lock">Pronto</span>
          </span>
          <span className="nav-item disabled" aria-disabled="true">
            <span className="nav-symbol" aria-hidden="true">▦</span> Inventario
            <span className="nav-lock">Pronto</span>
          </span>
          <span className="nav-item disabled" aria-disabled="true">
            <span className="nav-symbol" aria-hidden="true">◫</span> Productos
            <span className="nav-lock">Pronto</span>
          </span>
          <span className="nav-item disabled" aria-disabled="true">
            <span className="nav-symbol" aria-hidden="true">↗</span> Reportes
            <span className="nav-lock">Pronto</span>
          </span>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-indicator">
            <span className="connection-dot" aria-hidden="true" />
            <span>
              <strong>Modo de preparación</strong>
              <small>Sin datos comerciales conectados</small>
            </span>
          </div>
          <small className="sidebar-version">MICRO APP · VERSIÓN INICIAL</small>
        </div>
      </aside>

      <section className="main-panel" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">Mi negocio <span>/</span> Resumen</div>
          <span className="environment-badge"><span /> Entorno de desarrollo</span>
        </header>

        <div className="page-content">
          <section className="welcome">
            <div>
              <p className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</p>
              <h1>Un comienzo claro.</h1>
              <p className="welcome-copy">
                Estamos preparando las herramientas para gestionar tus ventas,
                controlar el inventario y consultar precios en USD y VES.
              </p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="art-ring ring-one" />
              <div className="art-ring ring-two" />
              <div className="art-card">
                <span className="art-card-label">MICRO APP</span>
                <span className="art-card-line" />
                <span className="art-card-line short" />
                <span className="art-card-foot">GESTIÓN · CONTROL · CLARIDAD</span>
              </div>
            </div>
          </section>

          <section className="setup-banner" aria-labelledby="setup-title">
            <div className="setup-icon" aria-hidden="true">↗</div>
            <div className="setup-text">
              <h2 id="setup-title">Configuración en progreso</h2>
              <p>La base técnica está en preparación. Aún no se guardan ventas ni productos reales.</p>
            </div>
            <span className="setup-status">Fase inicial</span>
          </section>

          <section className="modules-section" aria-labelledby="modules-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">MÓDULOS DEL SISTEMA</p>
                <h2 id="modules-title">Lo que estamos preparando</h2>
              </div>
              <span className="module-count">04 módulos previstos</span>
            </div>

            <div className="module-grid">
              {modules.map((module) => (
                <article className="module-card" key={module.number}>
                  <div className="module-card-top">
                    <span className="module-number">{module.number}</span>
                    <span className="module-indicator" aria-hidden="true">↗</span>
                  </div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <div className="module-card-bottom">
                    <span className="module-status-dot" aria-hidden="true" />
                    <span>{module.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="main-footer">
            <span>Micro app · Punto de venta e inventario</span>
            <span>Sin servicios de pago obligatorios</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
