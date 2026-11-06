// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductForm from "./ProductForm";

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function field(labelText: string): HTMLInputElement | HTMLTextAreaElement {
  const label = [...container.querySelectorAll("label")].find((item) => item.textContent?.includes(labelText));
  const control = label?.querySelector("input, textarea");
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
    throw new Error(`Field not found: ${labelText}`);
  }
  return control;
}

async function submitForm() {
  const form = container.querySelector("form");
  if (!form) throw new Error("Product form not found");
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
});

describe("product form", () => {
  it("creates a product with exact decimal strings and no discount fields", async () => {
    const onSaved = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "product-1" }));

    await act(async () => {
      root.render(<ProductForm organizationId="org-1" onCancel={vi.fn()} onSaved={onSaved} />);
    });
    await act(async () => {
      setValue(field("SKU"), "COFFEE-001");
      setValue(field("Nombre"), "Café");
      setValue(field("Precio USD"), "23.8500");
      setValue(field("Costo USD"), "10.0000");
    });
    await submitForm();

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("/api/orgs/org-1/catalog");
    expect(init?.method).toBe("POST");
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload.price_usd).toBe("23.8500");
    expect(payload.cost_usd).toBe("10.0000");
    expect(payload.minimum_stock).toBe("0.000");
    expect(payload).not.toHaveProperty("discount");
    expect(payload).not.toHaveProperty("discount_usd");
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("updates a product without overwriting the minimum stock that the read API does not expose", async () => {
    const onSaved = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "product-1" }));
    const product = {
      id: "product-1",
      sku: "COFFEE-001",
      barcode: null,
      name: "Café",
      description: null,
      unit: "kg",
      cost_usd: "10.0000",
      price_usd: "23.8500",
      is_active: true,
    };

    await act(async () => {
      root.render(<ProductForm organizationId="org-1" product={product} onCancel={vi.fn()} onSaved={onSaved} />);
    });
    await act(async () => { setValue(field("Precio USD"), "24.0000"); });
    await submitForm();

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("/api/orgs/org-1/catalog/product-1");
    expect(init?.method).toBe("PATCH");
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload.price_usd).toBe("24.0000");
    expect(payload).not.toHaveProperty("minimum_stock");
    expect(payload.is_active).toBe(true);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("rejects negative monetary values before sending a request", async () => {
    await act(async () => {
      root.render(<ProductForm organizationId="org-1" onCancel={vi.fn()} onSaved={vi.fn()} />);
    });
    await act(async () => {
      setValue(field("SKU"), "BAD-001");
      setValue(field("Nombre"), "Producto inválido");
      setValue(field("Precio USD"), "-1.0000");
    });
    await submitForm();

    expect(container.textContent).toContain("no pueden ser negativos");
    expect(fetch).not.toHaveBeenCalled();
  });
});
