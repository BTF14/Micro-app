import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Fixture = {
  organizationId: string;
  branchId: string;
  warehouseId: string;
  registerId: string;
  ownerSessionToken: string;
  cashierSessionToken: string;
  productName: string;
  productSku: string;
  bcvRate: string;
  effectiveDate: string;
  ownerDisplayName: string;
  cashierDisplayName: string;
};

const fixturePath = process.env.E2E_FIXTURE_PATH;
if (!fixturePath) throw new Error("E2E_FIXTURE_PATH is required for the real full-stack browser test.");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;

test.describe.configure({ mode: "serial", retries: 0 });

async function readStock(page: import("@playwright/test").Page): Promise<{ status: number; onHand: string | null; available: string | null }> {
  const result = await page.evaluate(async ({ organizationId, branchId, warehouseId, productSku }) => {
    const path = `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}/inventory?limit=100&q=${encodeURIComponent(productSku)}`;
    const response = await fetch(path, { cache: "no-store", credentials: "include" });
    const payload = await response.json() as {
      items?: Array<{ sku: string; on_hand_quantity: string; available_quantity: string }>;
    };
    const item = payload.items?.find((entry) => entry.sku === productSku);
    return {
      status: response.status,
      onHand: item?.on_hand_quantity ?? null,
      available: item?.available_quantity ?? null,
    };
  }, {
    organizationId: fixture.organizationId,
    branchId: fixture.branchId,
    warehouseId: fixture.warehouseId,
    productSku: fixture.productSku,
  });
  return result;
}

function readInventorySnapshot(): { onHand: string; movementCount: number; ledgerQuantity: string } {
  const databaseUrl = process.env.DATABASE_URL_ADMIN;
  if (!databaseUrl) throw new Error("DATABASE_URL_ADMIN is required for the real stock-atomicity assertion.");
  const query = `
    WITH target_product AS (
      SELECT id FROM public.products
       WHERE organization_id = :'organization_id'::uuid AND sku = :'product_sku'
    )
    SELECT concat_ws('|',
      COALESCE((SELECT b.on_hand_quantity::text FROM public.inventory_balances b
        JOIN target_product p ON p.id = b.product_id
        WHERE b.organization_id = :'organization_id'::uuid AND b.branch_id = :'branch_id'::uuid
          AND b.warehouse_id = :'warehouse_id'::uuid), '0.000'),
      COALESCE((SELECT count(*)::text FROM public.warehouse_inventory_movements m
        JOIN target_product p ON p.id = m.product_id
        WHERE m.organization_id = :'organization_id'::uuid AND m.branch_id = :'branch_id'::uuid
          AND m.warehouse_id = :'warehouse_id'::uuid), '0'),
      COALESCE((SELECT sum(m.quantity_delta)::text FROM public.warehouse_inventory_movements m
        JOIN target_product p ON p.id = m.product_id
        WHERE m.organization_id = :'organization_id'::uuid AND m.branch_id = :'branch_id'::uuid
          AND m.warehouse_id = :'warehouse_id'::uuid), '0')
    );
  `;
  const connection = new URL(databaseUrl);
  const environment = {
    ...process.env,
    PGHOST: connection.hostname,
    PGPORT: connection.port || "5432",
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGDATABASE: connection.pathname.substring(1),
    ...(connection.searchParams.get("sslmode") ? { PGSSLMODE: connection.searchParams.get("sslmode")! } : {}),
  };
  const output = execFileSync("psql", [
    "-X", "-v", "ON_ERROR_STOP=1",
    "-v", `organization_id=${fixture.organizationId}`,
    "-v", `branch_id=${fixture.branchId}`,
    "-v", `warehouse_id=${fixture.warehouseId}`,
    "-v", `product_sku=${fixture.productSku}`,
    "-At",
  ], { encoding: "utf8", env: environment, input: query }).trim();
  const [onHand, movementCount, ledgerQuantity] = output.split("|");
  if (!onHand || movementCount === undefined || !ledgerQuantity) throw new Error("E2E_INVENTORY_SNAPSHOT_INVALID");
  return { onHand, movementCount: Number(movementCount), ledgerQuantity };
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page, surface: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `${surface}: document overflow ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body, `${surface}: body overflow ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport);
}

async function navigateByKeyboard(page: import("@playwright/test").Page, name: string): Promise<void> {
  const toggle = page.locator(".mobile-nav-toggle");
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute("aria-expanded") !== "true") {
    await toggle.focus();
    await page.keyboard.press("Enter");
  }
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const tabStops = page.locator("#primary-navigation a[href], #primary-navigation button:not([disabled])");
  const targetIndex = await tabStops.evaluateAll((elements, target) =>
    elements.findIndex((element) => (element.textContent ?? "").includes(target as string)), name);
  expect(targetIndex, `Keyboard navigation target not found: ${name}`).toBeGreaterThanOrEqual(0);
  for (let index = 0; index <= targetIndex; index += 1) await page.keyboard.press("Tab");
  const navigation = page.getByRole("button", { name, exact: true });
  await expect(navigation).toBeFocused();
  await page.keyboard.press("Enter");
}

async function addProductToCart(page: import("@playwright/test").Page): Promise<void> {
  const search = page.getByLabel("Buscar producto", { exact: true });
  await search.fill(fixture.productSku);
  const add = page.getByRole("button", { name: "+ Agregar", exact: true });
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.locator(".sales-cart-lines")).toContainText(fixture.productName);
}

async function completeSale(page: import("@playwright/test").Page, currency: "USD" | "VES"): Promise<void> {
  const paymentCurrency = page.locator(".sales-payments-heading select");
  await expect(paymentCurrency).toHaveCount(1);
  await paymentCurrency.selectOption(currency);
  await page.getByRole("button", { name: "Monto exacto", exact: true }).click();
  const charge = page.getByRole("button", { name: "Cobrar venta", exact: true });
  await expect(charge).toBeEnabled();
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/checkout") && response.request().method() === "POST",
  );
  await charge.focus();
  await page.keyboard.press("Enter");
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Comprobante de venta" })).toBeVisible();
  await expect(page.locator(".sales-receipt")).toContainText(fixture.productName);
  if (currency === "USD") {
    await expect(page.locator(".sales-receipt-payments")).toContainText("US$");
  } else {
    await expect(page.locator(".sales-receipt-payments")).toContainText("Bs.");
  }
}

test("real catalog → inventory receipt → register → USD/VES POS → close → stale checkout rejection", async ({ page, context, browser, baseURL }) => {
  test.setTimeout(180_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  await page.setViewportSize({ width: 390, height: 844 });

  // Unauthenticated login is served by the real Hono API; no route or API mocks.
  const loginContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const loginPage = await loginContext.newPage();
  await loginPage.goto("/");
  await expect(loginPage.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
  const googleLink = loginPage.getByRole("link", { name: "Continuar con Google" });
  await expect(googleLink).toBeVisible();
  await expect(googleLink).toHaveAttribute("href", /\/auth\/google$/);
  await loginPage.keyboard.press("Tab");
  await expect(googleLink).toBeFocused();
  const focusOutline = await googleLink.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(focusOutline).not.toBe("none");
  const faqTrigger = loginPage.getByRole("button", { name: "Preguntas frecuentes" });
  await faqTrigger.focus();
  await loginPage.keyboard.press("Enter");
  const loginDialog = loginPage.getByRole("dialog", { name: "Preguntas frecuentes" });
  await expect(loginDialog).toBeVisible();
  const closeDialog = loginDialog.getByRole("button", { name: "Cerrar" });
  await expect(closeDialog).toBeFocused();
  await loginDialog.locator('a[href], button:not([disabled]), summary').last().focus();
  await loginPage.keyboard.press("Tab");
  await expect(closeDialog).toBeFocused();
  await loginPage.keyboard.press("Enter");
  await expect(loginDialog).toBeHidden();
  await expect(faqTrigger).toBeFocused();
  await loginContext.close();

  await context.addCookies([{
    name: "microapp_session",
    value: fixture.ownerSessionToken,
    url: baseURL,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  }]);

  const requestOrigins = new Set<string>();
  const requestPaths = new Set<string>();
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
      requestOrigins.add(url.origin);
      requestPaths.add(url.pathname);
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: `Hola, ${fixture.ownerDisplayName.split(" ")[0]}.` })).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile overview");

  // 1. Create and read a real catalog product through the UI and Hono API.
  const productCreateResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/catalog") && response.request().method() === "POST",
  );
  await navigateByKeyboard(page, "Productos");
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile catalog");
  await page.getByRole("button", { name: "Nuevo producto", exact: true }).click();
  await page.getByLabel("SKU", { exact: true }).fill(fixture.productSku);
  await page.getByLabel("Nombre", { exact: true }).fill(fixture.productName);
  await page.getByLabel("Código de barras", { exact: true }).fill(`BAR-${fixture.productSku}`);
  await page.getByLabel("Unidad", { exact: true }).fill("unidad");
  await page.getByLabel("Descripción", { exact: true }).fill("Synthetic product for real full-stack CI.");
  await page.getByLabel(/Precio USD/).fill("10.0000");
  await page.getByLabel(/Costo USD/).fill("4.0000");
  await page.getByLabel(/Stock mínimo/).fill("0");
  await page.getByRole("button", { name: "Crear producto", exact: true }).click();
  expect((await productCreateResponse).status()).toBe(201);
  await expect(page.getByText(fixture.productName, { exact: true })).toBeVisible();
  await page.getByLabel("Buscar productos", { exact: true }).fill(fixture.productSku);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText(fixture.productName, { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile catalog search");

  // 2. Receive inventory through the real receipt UI and database function.
  await navigateByKeyboard(page, "Inventario");
  const receiptForm = page.locator("form.inventory-operation-form").first();
  await expect(receiptForm.getByRole("heading", { name: "Recibir mercancía" })).toBeVisible();
  await receiptForm.getByLabel("Cantidad", { exact: true }).fill("5");
  await receiptForm.getByLabel("Costo unitario USD", { exact: true }).fill("4.0000");
  await receiptForm.getByLabel("Motivo", { exact: true }).fill("Recepción sintética E2E");
  const receiptResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/receipts") && response.request().method() === "POST",
  );
  await receiptForm.getByRole("button", { name: "Registrar recepción", exact: true }).click();
  expect((await receiptResponsePromise).status()).toBe(201);
  await expect(page.getByRole("status").filter({ hasText: "Recepción registrada y existencias actualizadas." })).toBeVisible();
  expect(await readStock(page)).toMatchObject({ status: 200, onHand: "5.000", available: "5.000" });
  await expectNoHorizontalOverflow(page, "mobile inventory receipt");

  // The cashier is a separate persisted identity: the database opening trigger
  // requires organization role cashier, while catalog/receipt writes require owner.
  const cashierContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await cashierContext.addCookies([{
    name: "microapp_session",
    value: fixture.cashierSessionToken,
    url: baseURL,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  }]);
  cashierContext.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
      requestOrigins.add(url.origin);
      requestPaths.add(url.pathname);
    }
  });
  const cashierPage = await cashierContext.newPage();
  await cashierPage.goto("/");
  await expect(cashierPage.getByRole("heading", { name: `Hola, ${fixture.cashierDisplayName.split(" ")[0]}.` })).toBeVisible();
  await expectNoHorizontalOverflow(cashierPage, "mobile cashier overview");
  const assignedBranches = await cashierPage.evaluate(async (organizationId) => {
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/register-shifts/branches`, {
      cache: "no-store",
      credentials: "include",
    });
    return {
      status: response.status,
      body: await response.json() as { items?: Array<{ id: string; name: string }>; error?: string; message?: string },
    };
  }, fixture.organizationId);
  expect(assignedBranches.status, JSON.stringify(assignedBranches.body)).toBe(200);
  expect(assignedBranches.body.items?.some((branch) => branch.id === fixture.branchId)).toBe(true);
  const currentShift = await cashierPage.evaluate(async (organizationId) => {
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/register-shifts/current`, {
      cache: "no-store",
      credentials: "include",
    });
    return { status: response.status, body: await response.json() as { shift?: unknown; error?: string; message?: string } };
  }, fixture.organizationId);
  expect(currentShift.status, JSON.stringify(currentShift.body)).toBe(200);
  expect(currentShift.body.shift).toBeNull();

  // 3. Open a real cashier shift on the seeded branch/register.
  await navigateByKeyboard(cashierPage, "Caja y turnos");
  await expect(cashierPage.getByRole("heading", { name: "Turnos de caja" })).toBeVisible();
  await expectNoHorizontalOverflow(cashierPage, "mobile register shifts");
  const branchSelect = cashierPage.locator("select").filter({
    has: cashierPage.locator(`option[value="${fixture.branchId}"]`),
  });
  const registerSelect = cashierPage.locator("select").filter({
    has: cashierPage.locator(`option[value="${fixture.registerId}"]`),
  });
  await expect(branchSelect).toHaveValue(fixture.branchId);
  await expect(registerSelect).toHaveValue(fixture.registerId);
  await cashierPage.getByLabel("Fondo inicial USD", { exact: true }).fill("50.0000");
  await cashierPage.getByLabel("Fondo inicial VES", { exact: true }).fill("1000.00");
  const openShiftPromise = cashierPage.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/register-shifts") && response.request().method() === "POST",
  );
  await cashierPage.getByRole("button", { name: "Abrir turno", exact: true }).click();
  expect((await openShiftPromise).status()).toBe(201);
  await expect(cashierPage.getByText("Turno abierto correctamente. La apertura quedó registrada en auditoría.")).toBeVisible();

  // 4. Two real atomic checkouts exercise both supported settlement currencies.
  await navigateByKeyboard(cashierPage, "Ventas");
  await expect(cashierPage.getByRole("heading", { name: "Ventas" })).toBeVisible();
  await expectNoHorizontalOverflow(cashierPage, "mobile POS");
  await addProductToCart(cashierPage);
  await completeSale(cashierPage, "USD");
  expect(await readStock(cashierPage)).toMatchObject({ status: 200, onHand: "4.000", available: "4.000" });

  await cashierPage.getByRole("button", { name: "Nueva venta", exact: true }).click();
  await addProductToCart(cashierPage);
  await completeSale(cashierPage, "VES");
  expect(await readStock(cashierPage)).toMatchObject({ status: 200, onHand: "3.000", available: "3.000" });

  // Prepare one more sale in a still-open UI. A second page will close the shift,
  // making this page's cached shift deliberately stale without altering the API.
  await cashierPage.getByRole("button", { name: "Nueva venta", exact: true }).click();
  await addProductToCart(cashierPage);
  const staleQuantity = cashierPage.getByLabel(`Cantidad de ${fixture.productName}`, { exact: true });
  await staleQuantity.fill("3.000");
  await staleQuantity.press("Tab");
  const exactAmount = cashierPage.getByRole("button", { name: "Monto exacto", exact: true });
  await exactAmount.focus();
  await cashierPage.keyboard.press("Enter");
  await expect(cashierPage.getByRole("button", { name: "Cobrar venta", exact: true })).toBeEnabled();

  // A second real browser tab sells one unit after the first tab cached 3 units.
  const stockRacePage = await cashierContext.newPage();
  await stockRacePage.goto("/");
  await expect(stockRacePage.getByRole("heading", { name: `Hola, ${fixture.cashierDisplayName.split(" ")[0]}.` })).toBeVisible();
  await navigateByKeyboard(stockRacePage, "Ventas");
  await addProductToCart(stockRacePage);
  await completeSale(stockRacePage, "USD");
  expect(await readStock(stockRacePage)).toMatchObject({ status: 200, onHand: "2.000", available: "2.000" });
  await expectNoHorizontalOverflow(stockRacePage, "mobile POS receipt");

  const beforeInsufficientCheckout = readInventorySnapshot();
  const insufficientCheckoutPromise = cashierPage.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/checkout") && response.request().method() === "POST",
  );
  const staleCharge = cashierPage.getByRole("button", { name: "Cobrar venta", exact: true });
  await staleCharge.focus();
  await cashierPage.keyboard.press("Enter");
  const insufficientCheckout = await insufficientCheckoutPromise;
  expect(insufficientCheckout.status()).toBe(409);
  const insufficientBody = await insufficientCheckout.json() as { error?: string };
  expect(insufficientBody.error).toBe("INSUFFICIENT_STOCK");
  await expect(cashierPage.getByRole("alert")).toContainText("La existencia disponible del almacén es insuficiente.");
  const afterInsufficientCheckout = readInventorySnapshot();
  expect(afterInsufficientCheckout).toEqual(beforeInsufficientCheckout);
  expect(await readStock(cashierPage)).toMatchObject({ status: 200, onHand: "2.000", available: "2.000" });
  await expectNoHorizontalOverflow(cashierPage, "mobile insufficient-stock alert");
  await stockRacePage.close();

  // 5. Close the shift in a second cashier page and verify persistence after reload.
  const closer = await cashierContext.newPage();
  await closer.goto("/");
  await expect(closer.getByRole("heading", { name: `Hola, ${fixture.cashierDisplayName.split(" ")[0]}.` })).toBeVisible();
  await navigateByKeyboard(closer, "Caja y turnos");
  await expect(closer.getByText("Turno abierto", { exact: true })).toBeVisible();
  await closer.getByLabel("Conteo final USD", { exact: true }).fill("60.0000");
  await closer.getByLabel("Conteo final VES", { exact: true }).fill("1401.23");
  await closer.getByRole("button", { name: "Revisar cierre", exact: true }).click();
  const closeShiftPromise = closer.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/close") && response.request().method() === "POST",
  );
  await closer.getByRole("button", { name: "Confirmar cierre", exact: true }).click();
  const closeResponse = await closeShiftPromise;
  expect([200, 204]).toContain(closeResponse.status());
  await expect(closer.getByText("Turno cerrado y registrado en auditoría.")).toBeVisible();
  await closer.reload();
  await navigateByKeyboard(closer, "Caja y turnos");
  await expect(closer.getByText("Sin turno abierto", { exact: true })).toBeVisible();

  // 6. The stale cashier POS page reaches the real checkout API; the closed shift rejects it.
  const rejectedCheckoutPromise = cashierPage.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/checkout") && response.request().method() === "POST",
  );
  await cashierPage.getByRole("button", { name: "Cobrar venta", exact: true }).click();
  const rejectedCheckout = await rejectedCheckoutPromise;
  expect(rejectedCheckout.status()).toBe(409);
  const rejectedBody = await rejectedCheckout.json() as { error?: string };
  expect(rejectedBody.error).toBe("OPEN_SHIFT_REQUIRED");
  await expect(cashierPage.getByRole("alert").filter({
    hasText: "Debes tener tu propio turno abierto para registrar la venta.",
  })).toBeVisible();
  expect(await readStock(cashierPage)).toMatchObject({ status: 200, onHand: "2.000", available: "2.000" });

  await cashierPage.reload();
  await navigateByKeyboard(cashierPage, "Ventas");
  await expect(cashierPage.getByRole("heading", { name: "Abre tu turno antes de vender" })).toBeVisible();
  await cashierContext.close();

  // Every application API request used the real same-origin proxy; no page.route
  // or network response interception is installed in this spec.
  expect(requestPaths).toContain("/auth/me");
  expect([...requestPaths].some((path) => path.startsWith("/api/"))).toBe(true);
  expect([...requestOrigins]).toEqual([new URL(baseURL).origin]);
});


test("real CSV catalog import persists through PostgreSQL 18 on mobile", async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([{
    name: "microapp_session", value: fixture.ownerSessionToken, url: baseURL,
    httpOnly: true, secure: false, sameSite: "Lax",
  }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: `Hola, ${fixture.ownerDisplayName.split(" ")[0]}.` })).toBeVisible();
  await navigateByKeyboard(page, "Productos");
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
  await page.getByRole("button", { name: "Importar CSV", exact: true }).click();

  const sku = `CSV-E2E-001-${crypto.randomUUID().slice(0, 8)}`;
  const csv = `sku,name,price_usd\n${sku},Producto CSV E2E,12.5000\n`;
  await page.locator('.catalog-import input[type="file"]').setInputFiles({
    name: "catalogo-e2e.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8"),
  });
  const previewPromise = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith("/catalog/imports/preview") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Previsualizar importación", exact: true }).click();
  const previewResponse = await previewPromise;
  expect(previewResponse.status()).toBe(200);
  await expect(page.getByText("Resumen de la revisión", { exact: true })).toBeVisible();
  await expect(page.getByText("Altas", { exact: true })).toBeVisible();
  await expect(page.getByText("Actualizaciones", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile CSV preview");

  const applyPromise = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith("/catalog/imports/apply") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Confirmar importación", exact: true }).click();
  const applyResponse = await applyPromise;
  expect(applyResponse.status()).toBe(200);
  expect(applyResponse.request().headers()["idempotency-key"]).toMatch(/^csv-/);
  await expect(page.locator(".catalog-import-success")).toContainText("Importación completada");
  await expectNoHorizontalOverflow(page, "mobile CSV applied");

  await page.reload();
  await navigateByKeyboard(page, "Productos");
  await page.getByLabel("Buscar productos", { exact: true }).fill(sku);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Producto CSV E2E", { exact: true })).toBeVisible();
  const importedProductRow = page.locator(".catalog-table tbody tr").filter({ hasText: "Producto CSV E2E" });
  await expect(importedProductRow.locator(".catalog-product-meta")).toContainText(sku);
  await expectNoHorizontalOverflow(page, "mobile persisted CSV product");
});


test("mobile barcode scanner searches a real PostgreSQL product without sending camera frames", async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  await page.setViewportSize({ width: 390, height: 844 });
  const barcode = `750${crypto.randomUUID().replace(/\D/g, "").slice(0, 10).padEnd(10, "0")}`;
  const sku = `SCAN-E2E-${crypto.randomUUID().slice(0, 8)}`;
  const productName = "Producto escáner E2E";
  await page.addInitScript((scannedBarcode) => {
    const state = window as typeof window & { __barcodeDelivered?: boolean; __allowBarcodeDetection?: boolean; __scannerTrackStopCount?: number };
    state.__barcodeDelivered = false; state.__allowBarcodeDetection = false; state.__scannerTrackStopCount = 0;
    class BrowserBarcodeDetector {
      static async getSupportedFormats() { return ["ean_13"]; }
      async detect() {
        if (!state.__allowBarcodeDetection || state.__barcodeDelivered) return [];
        state.__barcodeDelivered = true;
        return [{ rawValue: scannedBarcode, format: "ean_13" }];
      }
    }
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: BrowserBarcodeDetector });
    const stream = new MediaStream();
    const track = { stop: () => { state.__scannerTrackStopCount = (state.__scannerTrackStopCount ?? 0) + 1; } } as MediaStreamTrack;
    Object.defineProperty(stream, "getTracks", { configurable: true, value: () => [track] });
    const mediaDevices = navigator.mediaDevices ?? {};
    if (!navigator.mediaDevices) Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices });
    Object.defineProperty(mediaDevices, "getUserMedia", { configurable: true, value: async () => stream });
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: () => Promise.resolve() });
  }, barcode);
  await context.addCookies([{ name: "microapp_session", value: fixture.ownerSessionToken, url: baseURL, httpOnly: true, secure: false, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: `Hola, ${fixture.ownerDisplayName.split(" ")[0]}.` })).toBeVisible();
  await navigateByKeyboard(page, "Productos");
  await page.getByRole("button", { name: "Nuevo producto", exact: true }).click();
  await page.getByLabel("SKU", { exact: true }).fill(sku);
  await page.getByLabel("Nombre", { exact: true }).fill(productName);
  await page.getByLabel("Código de barras", { exact: true }).fill(barcode);
  await page.getByLabel("Unidad", { exact: true }).fill("unidad");
  await page.getByLabel("Descripción", { exact: true }).fill("Producto sintético para E2E del escáner.");
  await page.getByLabel(/Precio USD/).fill("12.5000");
  await page.getByLabel(/Costo USD/).fill("5.0000");
  await page.getByLabel(/Stock mínimo/).fill("0");
  const createResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("/catalog") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Crear producto", exact: true }).click();
  expect((await createResponse).status()).toBe(201);
  await navigateByKeyboard(page, "Consultar precio");
  const scanButton = page.getByRole("button", { name: "Escanear", exact: true });
  await expect(scanButton).toBeEnabled(); await scanButton.click();
  const dialog = page.getByRole("dialog", { name: "Escanear código de barras" });
  await expect(dialog).toBeVisible(); await expect(dialog.getByRole("heading", { name: "Escanear código de barras" })).toBeVisible();
  await expect(dialog).not.toContainText("NotAllowedError");
  await page.evaluate(() => { (window as typeof window & { __allowBarcodeDetection?: boolean }).__allowBarcodeDetection = true; });
  const result = page.locator(".quick-lookup-result").filter({ hasText: productName });
  await expect(result).toBeVisible(); await expect(result).toContainText("US$"); await expect(result).toContainText("Bs."); await expect(result).toContainText("Agotado");
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __scannerTrackStopCount?: number }).__scannerTrackStopCount ?? 0)).toBe(1);
  await expectNoHorizontalOverflow(page, "mobile barcode lookup");
  await navigateByKeyboard(page, "Ventas");
  const salesScan = page.getByRole("button", { name: "Escanear", exact: true });
  await expect(salesScan).toBeVisible(); await expect(salesScan).toBeEnabled(); await salesScan.click();
  const salesDialog = page.getByRole("dialog", { name: "Escanear código de barras" });
  await expect(salesDialog).toBeVisible();
  await salesDialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expectNoHorizontalOverflow(page, "mobile sales scanner");
});
