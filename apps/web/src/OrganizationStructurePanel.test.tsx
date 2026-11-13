// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationStructurePanel from "./OrganizationStructurePanel";
import { apiRequest } from "./auth";

vi.mock("./auth", () => ({ apiRequest: vi.fn() }));

const structure = {
  branches: [{
    id: "11111111-2222-4333-8444-555555555555",
    name: "Centro", slug: "centro", is_active: true,
    warehouses: [{ id: "22222222-2222-4333-8444-555555555555", name: "Principal", code: "principal", is_active: true }],
    registers: [{ id: "33333333-2222-4333-8444-555555555555", name: "Caja 1", code: "caja-1", is_active: true }],
  }],
  members: [{
    user_id: "44444444-2222-4333-8444-555555555555",
    display_name: "Cajero Uno", email: "cashier@example.test", role: "cashier",
    organization_active: true,
    branch_memberships: { "11111111-2222-4333-8444-555555555555": true },
  }],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(apiRequest).mockReset();
  vi.mocked(apiRequest).mockResolvedValue(structure);
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
});

describe("Owner organization structure panel", () => {
  it("shows the full branch, warehouse, register and assignment workflow", async () => {
    await act(async () => { root.render(<OrganizationStructurePanel organizationId="aaaaaaaa-2222-4333-8444-555555555555" />); });
    expect(container.textContent).toContain("Estructura organizacional");
    expect(container.textContent).toContain("Sucursales");
    expect(container.textContent).toContain("Almacenes");
    expect(container.textContent).toContain("Cajas");
    expect(container.textContent).toContain("Miembros y asignaciones");
    expect(container.textContent).toContain("Cajero Uno");
    expect(container.textContent).toContain("Quitar de sucursal");
  });

  it("guides an owner to create the first branch when none exist", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ branches: [], members: [] });
    await act(async () => { root.render(<OrganizationStructurePanel organizationId="aaaaaaaa-2222-4333-8444-555555555555" />); });
    expect(container.textContent).toContain("Comienza creando tu primera sucursal");
    expect(container.textContent).toContain("Después podrás agregar sus almacenes y cajas");
  });

  it("sends assignment changes through the owner administration endpoint and refreshes", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(structure)
      .mockResolvedValueOnce({ membership: { is_active: false } })
      .mockResolvedValueOnce({ ...structure, members: [{ ...structure.members[0], branch_memberships: {} }] });
    await act(async () => { root.render(<OrganizationStructurePanel organizationId="aaaaaaaa-2222-4333-8444-555555555555" />); });
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Quitar de sucursal");
    expect(button).toBeTruthy();
    await act(async () => { button!.click(); });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/orgs/aaaaaaaa-2222-4333-8444-555555555555/branches/11111111-2222-4333-8444-555555555555/members/44444444-2222-4333-8444-555555555555",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ is_active: false }) }),
    );
    expect(apiRequest).toHaveBeenCalledTimes(3);
  });
});
