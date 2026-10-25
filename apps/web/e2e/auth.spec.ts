import { expect, test } from "@playwright/test";

// Password login/registration were retired (decision D4): the only sign-in
// path left in the UI is a top-level navigation to GET /auth/google. These
// specs cover the UI around that flow (the link itself and the friendly
// ?auth_error= handling) rather than the OAuth exchange, which cannot be
// run against the real Google provider in CI.

test("shows a Google sign-in link that starts the OAuth flow", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "No hay sesión activa" }) }));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
  const googleLink = page.getByRole("link", { name: /continuar con google/i });
  await expect(googleLink).toBeVisible();
  await expect(googleLink).toHaveAttribute("href", /\/auth\/google$/);
});

test("shows an admin-contact message for a failed Google callback and clears it from the URL", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "No hay sesión activa" }) }));

  await page.goto("/?auth_error=not_allowlisted");
  await expect(page.getByRole("alert")).toContainText("Comunícate con el administrador");
  await expect(page).toHaveURL((url) => !url.search);
});

test("displays the authenticated workspace when a session already exists", async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "user-e2e", email: "ana@example.com", display_name: "Ana Pérez" },
        organizations: [{ id: "org-e2e", name: "Mi tienda", slug: "mi-tienda", role: "owner" }],
      }),
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
  await expect(page.getByText("Mi tienda", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();
});
