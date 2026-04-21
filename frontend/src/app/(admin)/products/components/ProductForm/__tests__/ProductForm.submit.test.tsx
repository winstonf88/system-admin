import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";

const push = vi.fn();

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
    description: "Um boné",
    category_ids: [1],
    images: [{ id: 1, url: "/uploads/bone.png" }],
    variations: [{ id: 10, size: null, color: "Azul", quantity: 4 }],
  };

  beforeEach(() => {
    push.mockReset();
    createProduct.mockReset();
    updateProduct.mockReset();
  });

  it("creates a product and navigates to /products on success", async () => {
    const user = userEvent.setup();
    createProduct.mockResolvedValue({ ok: true, id: 42 });

    render(<ProductForm categories={baseCategories} mode="create" />);

    await user.type(screen.getByLabelText(/Nome/i), "Novo item");
    await user.clear(screen.getByPlaceholderText("ex.: M"));
    await user.type(screen.getByPlaceholderText("ex.: M"), "Único");

    await user.click(screen.getByRole("button", { name: "Criar produto" }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Novo item",
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

    const nameInput = screen.getByLabelText(/Nome/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Boné atualizado");

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: "Boné atualizado",
          category_ids: [1],
        }),
      );
    });
    expect(push).toHaveBeenCalledWith("/products");
  });
});
