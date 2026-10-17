export default function App() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">PUNTO DE VENTA · INVENTARIO</p>
        <h1 id="app-title">Micro app</h1>
        <p className="lead">
          Una base independiente para gestionar ventas e inventario con claridad,
          rapidez y control.
        </p>
        <div className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          Fundamentos iniciales en construcción
        </div>
        <p className="note">
          Esta pantalla es provisional. La caja, el catálogo y los datos reales
          no se habilitarán hasta contar con API, base de datos, permisos y pruebas.
        </p>
      </section>
      <footer>Micro app · Sin servicios de pago obligatorios</footer>
    </main>
  );
}
