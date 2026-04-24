import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";

const push = vi.fn();
const requestAnimationFrameMock = vi.fn(
  (callback: FrameRequestCallback): number => {
    callback(0);
    return 1;
  },
);
const { toastSuccess, toastError, toastDismiss } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastDismiss: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
    href: string;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
    dismiss: toastDismiss,
  },
}));

const createProduct = vi.fn();
const updateProduct = vi.fn();

vi.mock("@/lib/api-client/products", () => ({
  createProduct: (...args: unknown[]) => createProduct(...args),
  updateProduct: (...args: unknown[]) => updateProduct(...args),
  deleteProductImage: vi.fn().mockResolvedValue({ ok: true }),
  reorderProductImages: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/upload-product-image", () => ({
  uploadProductImageWithProgress: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/api-client/categories", () => ({
  createCategory: vi.fn(),
}));

import ProductForm from "../index";

describe("ProductForm submit flow", () => {
  const baseCategories: CategoryOption[] = [
    { id: 1, name: "Acessórios", parent_id: null },
  ];

  const sampleProduct: ProductRow = {
    id: 5,
    name: "Boné",
    price: 39.9,
    description: "Um boné",
    is_active: true,
    category_ids: [1],
    images: [{ id: 1, url: "/uploads/bone.png" }],
    variations: [{ id: 10, size: null, color: "Azul", quantity: 4 }],
  };

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);
    push.mockReset();
    createProduct.mockReset();
    updateProduct.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastDismiss.mockReset();
    requestAnimationFrameMock.mockClear();
  });

  it("creates a product and navigates to /products on success", async () => {
    const user = userEvent.setup();
    createProduct.mockResolvedValue({ ok: true, id: 42 });

    render(<ProductForm categories={baseCategories} mode="create" />);

    await user.type(
      screen.getByRole("textbox", { name: /^Nome$/i }),
      "Novo item",
    );
    await user.clear(screen.getByRole("textbox", { name: /^Preço$/i }));
    await user.type(screen.getByRole("textbox", { name: /^Preço$/i }), "5990");
    expect(screen.getByRole("textbox", { name: /^Preço$/i })).toHaveValue(
      "59,90",
    );
    await user.clear(screen.getByPlaceholderText("ex.: M"));
    await user.type(screen.getByPlaceholderText("ex.: M"), "Único");

    await user.click(screen.getByRole("button", { name: "Criar produto" }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Novo item",
          price: 59.9,
          is_active: true,
          category_ids: [1],
          description: null,
          variations: [
            expect.objectContaining({
              size: "Único",
              color: null,
              quantity: 0,
            }),
          ],
        }),
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Produto salvo com sucesso.", {
      duration: 3000,
    });
    expect(push).toHaveBeenCalledWith("/products");
  });

  it("updates a product on success", async () => {
    const user = userEvent.setup();
    updateProduct.mockResolvedValue({ ok: true });

    render(
      <ProductForm
        categories={baseCategories}
        mode="edit"
        product={sampleProduct}
      />,
    );

    expect(screen.getByRole("textbox", { name: /^Preço$/i })).toHaveValue(
      "39,90",
    );
    const nameInput = screen.getByRole("textbox", { name: /^Nome$/i });
    await user.clear(nameInput);
    await user.type(nameInput, "Boné atualizado");

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: "Boné atualizado",
          price: 39.9,
          is_active: true,
          category_ids: [1],
        }),
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Produto salvo com sucesso.", {
      duration: 3000,
    });
    expect(push).toHaveBeenCalledWith("/products");
  });

  it("shows backend price validation error on the price field", async () => {
    const user = userEvent.setup();
    createProduct.mockResolvedValue({
      ok: false,
      error: "O preço deve ser maior que zero.",
      fieldErrors: { price: "O preço deve ser maior que zero." },
    });

    render(<ProductForm categories={baseCategories} mode="create" />);

    await user.type(
      screen.getByRole("textbox", { name: /^Nome$/i }),
      "Produto com erro",
    );
    await user.clear(screen.getByRole("textbox", { name: /^Preço$/i }));
    await user.type(screen.getByRole("textbox", { name: /^Preço$/i }), "1000");
    await user.clear(screen.getByPlaceholderText("ex.: M"));
    await user.type(screen.getByPlaceholderText("ex.: M"), "Único");

    await user.click(screen.getByRole("button", { name: "Criar produto" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Revise os campos destacados no formulário.",
        { duration: 5000 },
      );
    });
    expect(push).not.toHaveBeenCalled();
  });
});
