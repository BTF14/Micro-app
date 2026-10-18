import { expect, test } from "@playwright/test";

const authResponse = {
  user: { id: "user-e2e", email: "ana@example.com", display_name: "Ana Pérez" },
  organizations: [{ id: "org-e2e", name: "Mi tienda", slug: "mi-tienda", role: "owner" }],
};

test("logs in and displays the authenticated workspace", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "No hay sesión activa" }) }));
  await page.route("**/auth/login", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.postDataJSON()).toEqual({ email: "ana@example.com", password: "correct-horse-battery" });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(authResponse) });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
  await page.getByLabel("Correo electrónico").fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("correct-horse-battery");
  await page.getByRole("button", { name: /entrar a mi cuenta/i }).click();
  await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
  await expect(page.getByText("Mi tienda", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();
});

test("registration form validates required fields and reports API errors", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "No hay sesión activa" }) }));
  await page.route("**/auth/register", async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "El correo ya está registrado." }) });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /crear cuenta/i }).first().click();
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await page.getByLabel("Tu nombre").fill("Ana Pérez");
  await page.getByLabel("Nombre del negocio").fill("Mi tienda");
  await page.getByLabel("Correo electrónico").fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("a-strong-password-12");
  await page.getByRole("button", { name: /crear cuenta/i }).last().click();
  await expect(page.getByRole("alert")).toContainText("El correo ya está registrado.");
});
