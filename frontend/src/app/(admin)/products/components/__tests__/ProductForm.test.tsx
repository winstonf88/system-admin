import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryOption, ProductRow } from "@/app/(admin)/products/components/product-types";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("next/link", () => ({
  default ({
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

const createProductAction = vi.fn();
const updateProductAction = vi.fn();
const createCategoryAction = vi.fn();

vi.mock("@/app/actions/products", () => ({
  createProductAction: (...a: unknown[]) => createProductAction(...a),
  updateProductAction: (...a: unknown[]) => updateProductAction(...a),
  deleteProductImageAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/upload-product-image", () => ({
  uploadProductImageWithProgress: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/app/actions/categories", () => ({
  createCategoryAction: (...a: unknown[]) => createCategoryAction(...a),
}));

import ProductForm from "../ProductForm";

describe("ProductForm", () => {
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
    refresh.mockReset();
    createProductAction.mockReset();
    updateProductAction.mockReset();
    createCategoryAction.mockReset();
  });

  it("creates a product and navigates to /products on success", async () => {
    const user = userEvent.setup();
    createProductAction.mockResolvedValue({ ok: true, id: 42 });

    render(<ProductForm categories={baseCategories} mode="create" />);

    await user.type(screen.getByLabelText(/Nome/i), "Novo item");
    await user.clear(screen.getByPlaceholderText("ex.: M"));
    await user.type(screen.getByPlaceholderText("ex.: M"), "Único");

    await user.click(screen.getByRole("button", { name: "Criar produto" }));

    await waitFor(() => {
      expect(createProductAction).toHaveBeenCalledWith(
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
    expect(refresh).toHaveBeenCalled();
  });

  it("updates a product on success", async () => {
    const user = userEvent.setup();
    updateProductAction.mockResolvedValue({ ok: true });

    render(
      <ProductForm categories={baseCategories} mode="edit" product={sampleProduct} />,
    );

    const nameInput = screen.getByLabelText(/Nome/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Boné atualizado");

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(updateProductAction).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: "Boné atualizado",
          category_ids: [1],
        }),
      );
    });
    expect(push).toHaveBeenCalledWith("/products");
    expect(refresh).toHaveBeenCalled();
  });

  describe("category modal", () => {
    it("opens with empty categories and creates a category, then allows submit", async () => {
      const user = userEvent.setup();
      createCategoryAction.mockResolvedValue({
        ok: true,
        category: { id: 99, name: "Calçados", parent_id: null },
      });
      createProductAction.mockResolvedValue({ ok: true, id: 1 });

      render(<ProductForm categories={[]} mode="create" />);

      const modalHeading = screen.getByRole("heading", { name: "Nova categoria" });
      expect(modalHeading).toBeInTheDocument();

      await user.type(screen.getByLabelText(/Nome da categoria/i), "Calçados");
      await user.click(screen.getByRole("button", { name: "Criar e selecionar" }));

      await waitFor(() => {
        expect(createCategoryAction).toHaveBeenCalledWith({
          name: "Calçados",
          parent_id: null,
        });
      });

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: "Nova categoria" }),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByRole("checkbox", { name: /Calçados/i })).toBeChecked();

      await user.type(screen.getByLabelText(/^Nome$/i), "Tênis");
      await user.clear(screen.getByPlaceholderText("ex.: M"));
      await user.type(screen.getByPlaceholderText("ex.: M"), "42");

      await user.click(screen.getByRole("button", { name: "Criar produto" }));

      await waitFor(() => {
        expect(createProductAction).toHaveBeenCalled();
      });
    });

    it("opens from Nova categoria when categories already exist", async () => {
      const user = userEvent.setup();
      createCategoryAction.mockResolvedValue({
        ok: true,
        category: { id: 2, name: "Sub", parent_id: 1 },
      });

      render(<ProductForm categories={baseCategories} mode="create" />);

      expect(
        screen.queryByRole("heading", { name: "Nova categoria" }),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /Nova categoria/i }),
      );

      expect(
        screen.getByRole("heading", { name: "Nova categoria" }),
      ).toBeInTheDocument();

      await user.type(screen.getByLabelText(/Nome da categoria/i), "Sub");
      await user.click(screen.getByRole("button", { name: "Criar e selecionar" }));

      await waitFor(() => {
        expect(createCategoryAction).toHaveBeenCalledWith({
          name: "Sub",
          parent_id: null,
        });
      });

      expect(screen.getByRole("checkbox", { name: /Sub/i })).toBeChecked();
    });

    it("shows validation when category name is empty", async () => {
      const user = userEvent.setup();

      render(<ProductForm categories={[]} mode="create" />);

      await user.click(screen.getByRole("button", { name: "Criar e selecionar" }));

      expect(
        await screen.findByText("Informe o nome da categoria."),
      ).toBeInTheDocument();
      expect(createCategoryAction).not.toHaveBeenCalled();
    });

    it("shows API error when category creation fails", async () => {
      const user = userEvent.setup();
      createCategoryAction.mockResolvedValue({
        ok: false,
        error: "Nome já existe.",
      });

      render(<ProductForm categories={[]} mode="create" />);

      await user.type(screen.getByLabelText(/Nome da categoria/i), "Dup");
      await user.click(screen.getByRole("button", { name: "Criar e selecionar" }));

      expect(await screen.findByText("Nome já existe.")).toBeInTheDocument();
    });
  });
});
