import { expect, test, type Page } from "@playwright/test";

const organizationId = "org-visual-tour";
const branchId = "branch-centro";
const warehouseId = "warehouse-principal";
const registerId = "register-principal";
const product = {
  product_id: "product-cafe", id: "product-cafe", is_active: true,
  sku: "CAF-001", barcode: "7501234567890", name: "Café molido 500 g",
  description: "Café de tueste medio", unit: "unidad", quantity_mode: "integer",
  price_usd: "8.5000", cost_usd: "5.0000", minimum_stock: "3.000",
  on_hand_quantity: "24.000", reserved_quantity: "2.000", available_quantity: "22.000",
};
const shift = {
  id: "shift-visual", shift_id: "shift-visual", organization_id: organizationId,
  branch_id: branchId, register_id: registerId, cashier_user_id: "user-ana",
  opened_at: "2026-11-21T13:00:00.000Z", openedAt: "2026-11-21T13:00:00.000Z",
  opening_cash_usd: "0.0000", opening_cash_ves: "0.00",
  openingCashUsd: "0.0000", openingCashVes: "0.00",
  branch_name: "Sucursal Centro", register_name: "Caja principal", cashier_name: "Ana Pérez",
};

async function installStubs(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const json = (body: unknown, status = 200) => route.fulfill({
      status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body),
    });
    if (path.endsWith("/auth/me")) return json({
      user: { id: "user-ana", email: "ana@example.test", display_name: "Ana Pérez" },
      organizations: [{ id: organizationId, name: "Tienda Centro", slug: "tienda-centro", role: "owner" }],
    });
    if (path.endsWith("/bcv/sync-state")) return json({
      source: "BCV", health: "succeeded", lastAttemptAt: "2026-11-21T13:00:00.000Z",
      lastSuccessAt: "2026-11-21T13:00:00.000Z", lastOutcome: "success", lastErrorCode: null,
      lastEffectiveDate: "2026-11-21", updatedAt: "2026-11-21T13:00:00.000Z",
      attemptAgeSeconds: 120, isStaleRunning: false, staleRunningThresholdSeconds: 900,
    });
    if (path.endsWith("/exchange-rates/latest")) return json({
      rate: "897.53830000", effectiveDate: "2026-11-21", operationDate: "2026-11-21",
      fetchedAt: "2026-11-21T13:00:00.000Z", source: "BCV", status: "current",
    });
    if (path.endsWith("/register-shifts/branches")) return json({ items: [{ id: branchId, name: "Sucursal Centro", slug: "centro" }] });
    if (path.endsWith("/register-shifts/current")) return json({ shift: { ...shift, branch_id: branchId } });
    if (path.endsWith("/branches") || path.endsWith("/fx-delegated-branches")) return json({
      branches: [{ id: branchId, name: "Sucursal Centro", slug: "centro" }],
      items: [{ id: branchId, name: "Sucursal Centro", slug: "centro" }],
    });
    if (path.endsWith("/warehouses")) return json({
      warehouses: [{ id: warehouseId, code: "ALM-01", name: "Almacén principal", is_active: true }],
    });
    if (path.endsWith("/registers")) return json({ items: [{ id: registerId, name: "Caja principal", code: "CAJA-01", is_active: true }] });
    if (path.endsWith("/catalog")) return json({ items: [{
      id: product.id, is_active: true, sku: product.sku, barcode: product.barcode,
      name: product.name, description: product.description, unit: product.unit,
      quantity_mode: product.quantity_mode, price_usd: product.price_usd, cost_usd: product.cost_usd,
    }], nextCursor: null, limit: 100 });
    if (path.endsWith("/inventory")) return json({
      items: [{
        ...product, product_id: product.id, on_hand: "24.000", reserved: "2.000",
        available: "22.000", price_usd: product.price_usd, retail_valuation_usd: "187.0000",
        cost_valuation_usd: "110.0000",
      }], nextCursor: null, limit: 100,
    });
    if (path.endsWith("/receipts")) return json({ receipts: [{ id: "receipt-1", reason: "Reposición semanal", created_at: "2026-11-21T12:00:00.000Z", line_count: "1" }] });
    if (path.endsWith("/structure")) return json({
      branches: [{ id: branchId, name: "Sucursal Centro", slug: "centro", is_active: true,
        warehouses: [{ id: warehouseId, name: "Almacén principal", code: "ALM-01", is_active: true }],
        registers: [{ id: registerId, name: "Caja principal", code: "CAJA-01", is_active: true }] }],
      members: [{ user_id: "user-ana", display_name: "Ana Pérez", email: "ana@example.test", role: "owner", organization_active: true, branch_memberships: { [branchId]: true } }],
    });
    if (path.endsWith("/fx-contingency")) return json({ commercial_enabled: false, authorization: null,
      bcv: { status: "current", effective_date: "2026-11-21", rate: "897.53830000" } });
    if (path.endsWith("/fx-delegations")) return json({ delegations: [] });
    if (path.endsWith("/register-shifts")) return json({ items: [{
      ...shift, branch_name: "Sucursal Centro", register_name: "Caja principal", cashier_name: "Ana Pérez",
      closed_at: null, closing_cash_usd: null, closing_cash_ves: null,
    }] });
    if (path.endsWith("/closure-summary")) return json({
      shift: { ...shift, branch_name: "Sucursal Centro", register_name: "Caja principal", cashier_name: "Ana Pérez",
        closed_at: null, closing_cash_usd: null, closing_cash_ves: null },
      completed_sales_count: "3", non_completed_sales_count: "0", total_usd: "42.5000",
      total_ves_snapshot: "38145.38", payments: [{ method: "cash", currency: "USD", amount: "12.5000", usd_equivalent_snapshot: "12.5000" }],
      fx_breakdown: [{ settlement_currency: "USD", fx_source: "bcv_official", sales_count: "3", total_usd: "42.5000", total_ves_snapshot: "38145.38" }],
      expected_cash_usd: "12.5000", expected_cash_ves: "0.00", difference_cash_usd: null, difference_cash_ves: null,
    });
    if (path.endsWith("/reports/sales")) return json({
      items: [{ sale_number: "V-00021", completed_at: "2026-11-21T13:30:00.000Z", branch_name: "Sucursal Centro", cashier_name: "Ana Pérez", total_usd: "42.5000", total_ves_snapshot: "38145.38" }],
      total_usd: "42.5000", total_ves_snapshot: "38145.38", excluded_non_completed_count: "0",
    });
    if (path.endsWith("/reports/inventory")) return json({
      items: [{ branch_name: "Sucursal Centro", warehouse_name: "Almacén principal", sku: product.sku,
        product_name: product.name, on_hand: "24.000", reserved: "2.000", available: "22.000",
        price_usd: product.price_usd, retail_valuation_usd: "187.0000" }],
      include_valuation: true, total_retail_valuation_usd: "187.0000", total_cost_valuation_usd: "110.0000",
    });
    return json({});
  });
}

const views = [
  { id: "overview", label: "Resumen", nav: "Resumen", heading: "Hola, Ana." },
  { id: "catalog", label: "Productos", nav: "Productos", heading: "Catálogo" },
  { id: "inventory", label: "Inventario", nav: "Inventario", heading: "Inventario" },
  { id: "quick-lookup", label: "Consultar precio", nav: "Consultar precio", heading: "Consultar precio" },
  { id: "register-shifts", label: "Caja y turnos", nav: "Caja y turnos", heading: "Turnos de caja" },
  { id: "sales", label: "Ventas", nav: "Ventas", heading: "Ventas" },
  { id: "organization-structure", label: "Estructura", nav: "Estructura", heading: "Estructura organizacional" },
  { id: "fx-contingency", label: "Gestión cambiaria", nav: "Gestión cambiaria", heading: "Contingencia manual BCV" },
  { id: "reports", label: "Reportes", nav: "Reportes", heading: "Reportes" },
] as const;

test("visual tour: nine owner views at mobile, tablet and desktop sizes", async ({ page }) => {
  await installStubs(page);
  const unexpectedPageErrors: string[] = [];
  page.on("pageerror", (error) => unexpectedPageErrors.push(error.message));

  for (const viewport of [
    { name: "movil", width: 390, height: 844 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "pc", width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    // Each viewport is an independent visual-tour scenario; do not inherit the previous viewport's tab-persisted module.
    if (viewport.name !== "movil") await page.evaluate(() => window.sessionStorage.removeItem("micro-app:active-view"));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    const navigation = page.locator("#primary-navigation");
    if (viewport.name === "movil") {
      await page.locator(".mobile-nav-toggle").click();
      await expect(navigation).toBeVisible();
      await page.screenshot({ path: "apps/web/test-results/visual-tour/00-menu-abierto-movil-390x844.png", fullPage: false, animations: "disabled" });
    }

    for (let index = 0; index < views.length; index += 1) {
      const view = views[index]!;
      const favicon = await page.request.get("http://127.0.0.1:4173/favicon.svg");
      expect(favicon.status()).toBe(200);
      expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
      if (viewport.name === "movil" && index > 0) await page.locator(".mobile-nav-toggle").click();
      await expect(navigation).toBeVisible();
      const item = navigation.getByRole(view.id === "overview" ? "link" : "button", { name: view.nav, exact: true });
      await item.click();
      if (viewport.name === "movil") await expect(navigation).not.toHaveClass(/open/);
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();
      if (view.id === "quick-lookup") {
        await page.locator("#quick-product-search").fill("CAF-001");
        await expect(page.getByText("Café molido 500 g", { exact: true })).toBeVisible();
      }
      if (view.id === "sales") {
        await page.locator("#quick-product-search").fill("CAF-001");
        await expect(page.getByText("Café molido 500 g", { exact: true })).toBeVisible();
        await page.locator(".quick-lookup-results").getByRole("button", { name: "+ Agregar", exact: true }).click();
        await expect(page.getByText("Carrito", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Monto exacto", exact: true }).click();
        await expect(page.getByText(/Pagos:.*Total requerido:/)).toBeVisible();
      }
      if (view.id === "register-shifts" || view.id === "sales") {
        const operationalText = await page.locator("main").innerText();
        expect(operationalText).not.toContain("No disponible");
        expect(operationalText).not.toContain("branch-centro");
      }
      if (view.id === "catalog" || view.id === "inventory") {
        const tableWrap = page.locator(".catalog-table-wrap");
        await expect(tableWrap).toBeVisible();
        const tableOverflow = await tableWrap.evaluate((element) => ({
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }));
        expect(tableOverflow.scrollWidth).toBeLessThanOrEqual(tableOverflow.clientWidth + 1);
      }
      await expect(page.locator(".sidebar")).toHaveAttribute("aria-label", "Navegación principal");
      await expect(page.locator("main [role='alert']")).toHaveCount(0);
      const visibleText = await page.locator("body").innerText();
      expect(visibleText).not.toMatch(/\b(?:NaN|undefined|MAX_LINES|SQLSTATE|PostgreSQL|Hono|Cloudflare|Neon|TypeError)\b/i);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
      const filename = `${String(index + 1).padStart(2, "0")}-${view.id === "quick-lookup" ? "consultar-precio" : view.id === "register-shifts" ? "caja-y-turnos" : view.id === "organization-structure" ? "estructura" : view.id === "fx-contingency" ? "gestion-cambiaria" : view.id === "overview" ? "resumen" : view.id === "catalog" ? "productos" : view.id === "inventory" ? "inventario" : view.id === "sales" ? "ventas" : "reportes"}-${viewport.name}-${viewport.width}x${viewport.height}.png`;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `apps/web/test-results/visual-tour/${filename}`, fullPage: false, animations: "disabled" });
      if (view.id === "inventory") {
        const history = page.getByRole("heading", { name: "Recepciones recientes", exact: true });
        await history.scrollIntoViewIfNeeded();
        await expect(page.locator(".inventory-receipt-history")).toContainText("1 línea");
        await expect(page.locator(".inventory-receipt-history")).toContainText(/21 nov\. 2026/);
        await page.screenshot({ path: `apps/web/test-results/visual-tour/extra-inventario-${viewport.name}-${viewport.width}x${viewport.height}.png`, fullPage: false, animations: "disabled" });
      }
      if (view.id === "sales") {
        await expect(page.locator(".sales-payment-match")).toBeVisible();
        const chargeButton = page.getByRole("button", { name: "Cobrar venta", exact: true });
        await chargeButton.scrollIntoViewIfNeeded();
        await expect(chargeButton).toBeVisible();
        await expect(page.getByText(/Pagos:.*Total requerido:/)).toBeVisible();
        await page.screenshot({ path: `apps/web/test-results/visual-tour/extra-ventas-${viewport.name}-${viewport.width}x${viewport.height}.png`, fullPage: false, animations: "disabled" });
      }
      if (view.id === "reports") {
        const breakdown = page.getByRole("heading", { name: "Desglose de pagos", exact: true });
        await breakdown.scrollIntoViewIfNeeded();
        await expect(page.locator(".reports-table-wrap")).toContainText("Moneda");
        await expect(page.locator(".reports-table-wrap")).toContainText("12,50");
        await page.screenshot({ path: `apps/web/test-results/visual-tour/extra-reportes-${viewport.name}-${viewport.width}x${viewport.height}.png`, fullPage: false, animations: "disabled" });
      }
      expect(unexpectedPageErrors, `Errores inesperados en ${view.label} ${viewport.width}x${viewport.height}`).toEqual([]);
    }
  }
});
