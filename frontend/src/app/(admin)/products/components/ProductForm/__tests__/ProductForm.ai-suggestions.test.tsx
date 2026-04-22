import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";

const push = vi.fn();
const suggestProductFields = vi.fn();
const toastError = vi.fn();

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

vi.mock("@/lib/api-client/products", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProductImage: vi.fn().mockResolvedValue({ ok: true }),
  reorderProductImages: vi.fn().mockResolvedValue({ ok: true }),
  suggestProductFields: (...args: unknown[]) => suggestProductFields(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/lib/upload-product-image", () => ({
  uploadProductImageWithProgress: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/api-client/categories", () => ({
  createCategory: vi.fn(),
}));

import ProductForm from "../index";

describe("ProductForm AI suggestions behavior", () => {
  const categories: CategoryOption[] = [
    { id: 1, name: "Acessórios", parent_id: null },
    { id: 2, name: "Roupas", parent_id: null },
  ];

  const productWithImage: ProductRow = {
    id: 55,
    name: "Produto original",
    description: "Descrição original",
    category_ids: [1],
    images: [{ id: 101, url: "/uploads/sample.png" }],
    variations: [{ id: 1, size: "M", color: null, quantity: 2 }],
  };

  beforeEach(() => {
    push.mockReset();
    suggestProductFields.mockReset();
    toastError.mockReset();
  });

  it("requests all fields, refreshes active tab, and applies selected suggestions", async () => {
    const user = userEvent.setup();
    suggestProductFields
      .mockResolvedValueOnce({
        ok: true,
        suggestions: {
          name: ["Nome IA 1", "Nome IA 2"],
          description: ["Desc IA 1"],
          category: [2],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        suggestions: {
          name: [],
          description: ["Desc IA atualizada"],
          category: [],
        },
      });

    render(
      <ProductForm
        categories={categories}
        mode="edit"
        product={productWithImage}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Sugestao por IA para secao de nome, categoria e descricao",
      }),
    );

    await screen.findByRole("heading", { name: "Sugestoes por IA" });

    expect(suggestProductFields).toHaveBeenCalledWith({
      files: [],
      productImageIds: [101],
      fields: ["name", "description", "category"],
    });

    await user.click(screen.getByRole("radio", { name: "Nome IA 2" }));
    await user.click(screen.getByRole("tab", { name: "Descricao" }));
    await user.click(
      screen.getByRole("button", { name: "Atualizar sugestões" }),
    );

    await waitFor(() => {
      expect(suggestProductFields).toHaveBeenNthCalledWith(2, {
        files: [],
        productImageIds: [101],
        fields: ["description"],
      });
    });

    await screen.findByRole("radio", { name: "Desc IA atualizada" });
    await user.click(screen.getByRole("radio", { name: "Desc IA atualizada" }));
    await user.click(screen.getByRole("tab", { name: "Categoria" }));

    const categoryGroup = screen.getByRole("group", {
      name: "Categorias sugeridas por IA",
    });
    const roupasSuggestion = within(categoryGroup).getByRole("checkbox", {
      name: "Roupas",
    });
    await user.click(roupasSuggestion);
    expect(roupasSuggestion).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Salvar/atualizar" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Sugestoes por IA" }),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/^Nome$/i)).toHaveValue("Nome IA 2");
    expect(screen.getByPlaceholderText("Opcional")).toHaveValue(
      "Desc IA atualizada",
    );
    const productCategoryGroup = screen.getByRole("group", {
      name: "Categorias do produto",
    });
    expect(
      within(productCategoryGroup).getByRole("checkbox", { name: "Roupas" }),
    ).toBeChecked();
    expect(
      within(productCategoryGroup).getByRole("checkbox", {
        name: "Acessórios",
      }),
    ).not.toBeChecked();
  });

  it("requests only the clicked field for targeted AI buttons", async () => {
    const user = userEvent.setup();
    suggestProductFields.mockResolvedValue({
      ok: true,
      suggestions: {
        name: ["Nome IA único"],
        description: [],
        category: [],
      },
    });

    render(
      <ProductForm
        categories={categories}
        mode="edit"
        product={productWithImage}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Sugestao por IA para nome" }),
    );

    await screen.findByRole("heading", { name: "Sugestoes por IA" });

    expect(suggestProductFields).toHaveBeenCalledWith({
      files: [],
      productImageIds: [101],
      fields: ["name"],
    });
  });

  it("opens modal with available fields when one requested field is empty", async () => {
    const user = userEvent.setup();
    suggestProductFields.mockResolvedValue({
      ok: true,
      suggestions: {
        name: ["Nome IA único"],
        description: ["Descricao IA única"],
        category: [],
      },
    });

    render(
      <ProductForm
        categories={categories}
        mode="edit"
        product={productWithImage}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Sugestao por IA para secao de nome, categoria e descricao",
      }),
    );

    await screen.findByRole("heading", { name: "Sugestoes por IA" });
    expect(screen.getByRole("tab", { name: "Nome" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Descricao" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Categoria" }),
    ).not.toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows validation error when trying AI suggestions without any image", async () => {
    const user = userEvent.setup();

    render(<ProductForm categories={categories} mode="create" />);

    await user.click(
      screen.getByRole("button", { name: "Sugestao por IA para nome" }),
    );

    expect(
      await screen.findByText(
        "Adicione ao menos uma imagem para gerar sugestões por IA.",
      ),
    ).toBeInTheDocument();
    expect(suggestProductFields).not.toHaveBeenCalled();
  });

  it("shows API errors from suggestion endpoint", async () => {
    const user = userEvent.setup();
    suggestProductFields.mockResolvedValue({
      ok: false,
      error: "Serviço de IA indisponível.",
    });

    render(
      <ProductForm
        categories={categories}
        mode="edit"
        product={productWithImage}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Sugestao por IA para descricao" }),
    );

    expect(
      await screen.findByText("Serviço de IA indisponível."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Sugestoes por IA" }),
    ).not.toBeInTheDocument();
  });

  it("shows empty-suggestions error when AI returns no options for requested field", async () => {
    const user = userEvent.setup();
    suggestProductFields.mockResolvedValue({
      ok: true,
      suggestions: {
        name: [],
        description: [],
        category: [],
      },
    });

    render(
      <ProductForm
        categories={categories}
        mode="edit"
        product={productWithImage}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Sugestao por IA para categorias" }),
    );

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "A IA não retornou sugestões para o campo solicitado. Tente novamente com outras imagens.",
        { duration: 5000 },
      );
    });
    expect(
      screen.queryByRole("heading", { name: "Sugestoes por IA" }),
    ).not.toBeInTheDocument();
  });
});
