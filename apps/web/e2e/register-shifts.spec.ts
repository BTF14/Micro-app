import { expect, test } from "@playwright/test";

const organizationId = "org-e2e";
const branchId = "branch-e2e";
const registerId = "register-e2e";
const openedShift = {
  id: "shift-e2e",
  organization_id: organizationId,
  branch_id: branchId,
  register_id: registerId,
  cashier_user_id: "user-e2e",
  opened_at: "2026-11-11T12:00:00.000Z",
  opening_cash_usd: "50.0000",
  opening_cash_ves: "1000.00",
};

test("owner can open and explicitly close their own register shift from the workspace", async ({ page }) => {
  let currentShift: typeof openedShift | null = null;
  let openingPayload: Record<string, unknown> | null = null;
  let closingPayload: Record<string, unknown> | null = null;

  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: "user-e2e", email: "owner@example.com", display_name: "Ana Pérez" },
      organizations: [{ id: organizationId, name: "Mi tienda", slug: "mi-tienda", role: "owner" }],
    }),
  }));

  await page.route("**/api/exchange-rates/latest", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      rate: "897.53830000",
      effectiveDate: "2026-11-11",
      fetchedAt: "2026-11-11T12:00:00.000Z",
      source: "BCV",
      status: "current",
    }),
  }));

  await page.route("**/api/orgs/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (method === "GET" && path.endsWith("/branches")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [{ id: branchId, name: "Sucursal Centro", slug: "centro" }] }),
      });
    }
    if (method === "GET" && path.endsWith("/register-shifts/current")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ shift: currentShift ? { branch_id: branchId } : null }),
      });
    }
    if (method === "GET" && path.endsWith("/registers")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [{ id: registerId, name: "Caja principal", code: "CAJA-01" }] }),
      });
    }
    if (method === "POST" && path.endsWith("/register-shifts")) {
      openingPayload = request.postDataJSON() as Record<string, unknown>;
      currentShift = openedShift;
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ shift: openedShift }),
      });
    }
    if (method === "POST" && path.endsWith(`/register-shifts/${openedShift.id}/close`)) {
      closingPayload = request.postDataJSON() as Record<string, unknown>;
      currentShift = null;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ closed: true }) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Unexpected E2E API request" }) });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /caja y turnos/i }).click();

  await expect(page.getByRole("heading", { name: "Turnos de caja" })).toBeVisible();
  await expect(page.getByLabel("Sucursal")).toHaveValue(branchId);
  await page.getByLabel("Fondo inicial USD").fill("50.0000");
  await page.getByLabel("Fondo inicial VES").fill("1000.00");
  await page.getByRole("button", { name: "Abrir turno" }).click();

  await expect(page.getByText("Turno abierto correctamente.", { exact: false })).toBeVisible();
  await expect(page.getByText("Turno abierto", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Conteo final USD")).toHaveValue("");
  await expect(page.getByLabel("Conteo final VES")).toHaveValue("");
  await expect(page.getByLabel("Sucursal")).toBeDisabled();

  expect(openingPayload).toEqual({
    register_id: registerId,
    opening_cash_usd: "50.0000",
    opening_cash_ves: "1000.00",
  });

  await page.getByLabel("Conteo final USD").fill("47.5000");
  await page.getByLabel("Conteo final VES").fill("950.00");
  await page.getByRole("button", { name: "Revisar cierre" }).click();
  await expect(page.getByText(/Confirma que ambos importes corresponden al conteo físico final/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar cierre" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cierre" }).click();

  await expect(page.getByText("Turno cerrado y registrado en auditoría.", { exact: true })).toBeVisible();
  await expect(page.getByText("Sin turno abierto", { exact: true })).toBeVisible();
  expect(closingPayload).toEqual({
    closing_cash_usd: "47.5000",
    closing_cash_ves: "950.00",
  });
});
