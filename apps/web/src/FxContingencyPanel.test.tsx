// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FxContingencyPanel from "./FxContingencyPanel";
import { apiRequest } from "./auth";

vi.mock("./auth", () => ({ apiRequest: vi.fn() }));

const ORG = "11111111-2222-4333-8444-555555555555";
const BRANCH = "22222222-3333-4444-8555-666666666666";
const branchList = { branches: [{ id: BRANCH, name: "Central", slug: "central" }] };
const structure = { members: [{
  user_id: "admin-1", display_name: "Admin Central", role: "admin",
  organization_active: true, branch_memberships: { [BRANCH]: true },
}] };
const fxState = {
  kind: "ok", commercial_enabled: false, authorization: null,
  bcv: { last_success_at: null, last_outcome: "failed", last_effective_date: null, rate: null, validation_status: null },
};
let container: HTMLDivElement;
let root: Root;

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
function setInput(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(input) as object;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(input, value);
  const EventConstructor = input.ownerDocument.defaultView?.Event ?? Event;
  input.dispatchEvent(new EventConstructor("input", { bubbles: true }));
}
function click(label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
  if (!button) throw new Error("Button not found: " + label);
  button.click();
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(apiRequest).mockReset();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("FxContingencyPanel", () => {
  it("uses clear commercial copy and offers owner-only branch delegation without technical terms", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(branchList as never)
      .mockResolvedValueOnce(structure as never)
      .mockResolvedValueOnce(fxState as never)
      .mockResolvedValueOnce({ delegations: [] } as never);
    await act(async () => { root.render(<FxContingencyPanel organizationId={ORG} role="owner" />); });
    await settle(); await settle();
    expect(container.textContent).toContain("Uso en caja: desactivado por defecto hasta contar con validación contable y legal.");
    expect(container.textContent).not.toContain("AC-6");
    expect(container.textContent).toContain("Delegación de administradores");
    expect(container.textContent).toContain("Autorizar a este administrador");
    expect(container.textContent).not.toContain("fx.contingency.authorize");
  });

  it("renders the current BCV status, effective date and reference rate", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(branchList as never)
      .mockResolvedValueOnce({
        ...fxState,
        bcv: { status: "current", effective_date: "2026-11-20", rate: "918.76620000" },
      } as never);
    await act(async () => { root.render(<FxContingencyPanel organizationId={ORG} role="admin" />); });
    await settle(); await settle();
    expect(container.textContent).toContain("al día");
    expect(container.textContent).toContain("2026-11-20");
    expect(container.textContent).toContain("918.76620000");
  });

  it("sends the explicit high-deviation confirmation separately from its reason", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(branchList as never)
      .mockResolvedValueOnce(structure as never)
      .mockResolvedValueOnce(fxState as never)
      .mockResolvedValueOnce({ delegations: [] } as never)
      .mockResolvedValueOnce({ authorization_id: "auth-1" } as never)
      .mockResolvedValueOnce(fxState as never)
      .mockResolvedValueOnce({ delegations: [] } as never);
    await act(async () => { root.render(<FxContingencyPanel organizationId={ORG} role="owner" />); });
    await settle(); await settle();

    const inputs = [...container.querySelectorAll("input")];
    const rate = inputs.find((input) => input.type === "text" || input.inputMode === "decimal")!;
    const expiry = inputs.find((input) => input.type === "datetime-local")!;
    const pin = inputs.find((input) => input.type === "password")!;
    const reasonField = container.querySelector("textarea")!;
    await act(async () => {
      setInput(rate, "105.01000000");
      setInput(reasonField, "Contingencia de prueba con motivo específico.");
      setInput(expiry, "2026-11-17T20:00");
      const elevated = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      elevated.click();
    });
    const elevatedReasonField = container.querySelectorAll("textarea")[1]!;
    await act(async () => { setInput(elevatedReasonField, "Confirmo expresamente la desviación superior al cinco por ciento."); });
    await act(async () => { setInput(pin, "12345678"); });
    await act(async () => { click("Autorizar contingencia"); });
    const call = vi.mocked(apiRequest).mock.calls.find(([path]) => String(path).includes("/fx-contingency/authorizations"));
    expect(call).toBeTruthy();
    const body = JSON.parse(String((call?.[1] as RequestInit).body));
    expect(body.elevated_confirmation).toBe(true);
    expect(body.elevated_confirmation_reason).toContain("Confirmo expresamente");
  });

  it("renders delegated admin branch scope without exposing organization structure management", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(branchList as never)
      .mockResolvedValueOnce(fxState as never);
    await act(async () => { root.render(<FxContingencyPanel organizationId={ORG} role="admin" />); });
    await settle(); await settle();
    expect(container.textContent).toContain("Central");
    expect(container.textContent).not.toContain("Delegación de administradores");
  });
});
