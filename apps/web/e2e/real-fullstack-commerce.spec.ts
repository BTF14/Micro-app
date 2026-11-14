import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Fixture = {
  organizationId: string;
  branchId: string;
  warehouseId: string;
  registerId: string;
  sessionToken: string;
  productName: string;
  productSku: string;
  bcvRate: string;
  effectiveDate: string;
  userDisplayName: string;
};

const fixturePath = process.env.E2E_FIXTURE_PATH;
if (!fixturePath) throw new Error("E2E_FIXTURE_PATH is required for the real full-stack browser test.");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;

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

async function addProductToCart(page: import("@playwright/test").Page): Promise<void> {
  const search = page.getByLabel("Buscar producto", { exact: true });
  await search.fill(fixture.productSku);
  const add = page.getByRole("button", { name: "+ Agregar", exact: true });
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.locator(".sales-cart-lines")).toContainText(fixture.productName);
}

async function completeSale(page: import("@playwright/test").Page, currency: "USD" | "VES"): Promise<void> {
  await page.getByLabel("Moneda", { exact: true }).selectOption(currency);
  await page.getByRole("button", { name: "Monto exacto", exact: true }).click();
  const charge = page.getByRole("button", { name: "Cobrar venta", exact: true });
  await expect(charge).toBeEnabled();
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/checkout") && response.request().method() === "POST",
  );
  await charge.click();
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

test("real catalog → inventory receipt → register → USD/VES POS → close → stale checkout rejection", async ({ page, context, baseURL }) => {
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  await context.addCookies([{
    name: "microapp_session",
    value: fixture.sessionToken,
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
  await expect(page.getByRole("heading", { name: "Hola, E2E." })).toBeVisible();
  await expect(page.getByText("Sesión activa", { exact: true })).toBeVisible();

  // 1. Create and read a real catalog product through the UI and Hono API.
  const productCreateResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/catalog") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Productos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
  await page.getByRole("button", { name: "Nuevo producto", exact: true }).click();
  await page.getByLabel("SKU", { exact: true }).fill(fixture.productSku);
  await page.getByLabel("Nombre", { exact: true }).fill(fixture.productName);
  await page.getByLabel("Código de barras", { exact: true }).fill(`BAR-${fixture.productSku}`);
  await page.getByLabel("Unidad", { exact: true }).fill("unidad");
  await page.getByLabel("Descripción", { exact: true }).fill("Synthetic product for real full-stack CI.");
  await page.getByLabel("Precio USD", { exact: true }).fill("10.0000");
  await page.getByLabel("Costo USD", { exact: true }).fill("4.0000");
  await page.getByLabel("Stock mínimo", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Crear producto", exact: true }).click();
  expect((await productCreateResponse).status()).toBe(201);
  await expect(page.getByText(fixture.productName, { exact: true })).toBeVisible();
  await page.getByLabel("Buscar productos", { exact: true }).fill(fixture.productSku);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText(fixture.productName, { exact: true })).toBeVisible();

  // 2. Receive inventory through the real receipt UI and database function.
  await page.getByRole("button", { name: "Inventario", exact: true }).click();
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

  // 3. Open a real cashier shift on the seeded branch/register.
  await page.getByRole("button", { name: "Caja y turnos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Turnos de caja" })).toBeVisible();
  await page.getByLabel("Fondo inicial USD", { exact: true }).fill("50.0000");
  await page.getByLabel("Fondo inicial VES", { exact: true }).fill("1000.00");
  const openShiftPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/register-shifts") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Abrir turno", exact: true }).click();
  expect((await openShiftPromise).status()).toBe(201);
  await expect(page.getByText("Turno abierto correctamente. La apertura quedó registrada en auditoría.")).toBeVisible();

  // 4. Two real atomic checkouts exercise both supported settlement currencies.
  await page.getByRole("button", { name: "Ventas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ventas" })).toBeVisible();
  await addProductToCart(page);
  await completeSale(page, "USD");
  expect(await readStock(page)).toMatchObject({ status: 200, onHand: "4.000", available: "4.000" });

  await page.getByRole("button", { name: "Nueva venta", exact: true }).click();
  await addProductToCart(page);
  await completeSale(page, "VES");
  expect(await readStock(page)).toMatchObject({ status: 200, onHand: "3.000", available: "3.000" });

  // Prepare one more sale in a still-open UI. A second page will close the shift,
  // making this page's cached shift deliberately stale without altering the API.
  await page.getByRole("button", { name: "Nueva venta", exact: true }).click();
  await addProductToCart(page);
  await page.getByRole("button", { name: "Monto exacto", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cobrar venta", exact: true })).toBeEnabled();

  // 5. Close the shift in a second authenticated page and verify persistence after reload.
  const closer = await context.newPage();
  await closer.goto("/");
  await expect(closer.getByRole("heading", { name: "Hola, E2E." })).toBeVisible();
  await closer.getByRole("button", { name: "Caja y turnos", exact: true }).click();
  await expect(closer.getByText("Turno abierto", { exact: true })).toBeVisible();
  await closer.getByLabel("Conteo final USD", { exact: true }).fill("48.0000");
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
  await expect(closer.getByText("Sesión activa", { exact: true })).toBeVisible();
  await closer.getByRole("button", { name: "Caja y turnos", exact: true }).click();
  await expect(closer.getByText("Sin turno abierto", { exact: true })).toBeVisible();

  // 6. The stale POS page reaches the real checkout API; the closed shift rejects it.
  const rejectedCheckoutPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/checkout") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Cobrar venta", exact: true }).click();
  const rejectedCheckout = await rejectedCheckoutPromise;
  expect(rejectedCheckout.status()).toBe(409);
  const rejectedBody = await rejectedCheckout.json() as { error?: string };
  expect(rejectedBody.error).toBe("OPEN_SHIFT_REQUIRED");
  await expect(page.getByRole("alert").filter({
    hasText: "Debes tener tu propio turno abierto para registrar la venta.",
  })).toBeVisible();
  expect(await readStock(page)).toMatchObject({ status: 200, onHand: "3.000", available: "3.000" });

  await page.reload();
  await expect(page.getByText("Sesión activa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ventas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Abre tu turno antes de vender" })).toBeVisible();

  // Every application API request used the real same-origin proxy; no page.route
  // or network response interception is installed in this spec.
  expect(requestPaths).toContain("/auth/me");
  expect([...requestPaths].some((path) => path.startsWith("/api/"))).toBe(true);
  expect([...requestOrigins]).toEqual([new URL(baseURL).origin]);
});
