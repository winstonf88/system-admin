import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryOption, ProductRow } from "@/app/(admin)/products/components/product-types";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
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

const deleteProductAction = vi.fn();

vi.mock("@/app/actions/products", () => ({
  deleteProductAction: (...a: unknown[]) => deleteProductAction(...a),
}));

import ProductsList from "../ProductsList";

describe("ProductsList", () => {
  const categories: CategoryOption[] = [
    { id: 10, name: "Vestuário", parent_id: null },
    { id: 11, name: "Camisetas", parent_id: 10 },
  ];

  const product: ProductRow = {
    id: 1,
    name: "Camisa básica",
    description: null,
    category_ids: [11],
    images: [],
    variations: [
      { id: 1, size: "M", color: "Preto", quantity: 3 },
      { id: 2, size: "G", color: "Preto", quantity: 1 },
    ],
  };

  beforeEach(() => {
    refresh.mockReset();
    deleteProductAction.mockReset();
  });

  it("shows empty state with link to create when there are no products", () => {
    render(<ProductsList products={[]} categories={categories} />);
    expect(screen.getByText(/Nenhum produto cadastrado/i)).toBeInTheDocument();
    const first = screen.getByRole("link", { name: /Criar o primeiro/i });
    expect(first).toHaveAttribute("href", "/products/new");
  });

  it("renders product row with category label, variation count, and edit link", () => {
    render(<ProductsList products={[product]} categories={categories} />);

    expect(screen.getByText("Camisa básica")).toBeInTheDocument();
    expect(screen.getByText("Vestuário › Camisetas")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const edit = screen.getByRole("link", { name: "Editar" });
    expect(edit).toHaveAttribute("href", "/products/1/edit");
  });

  it("opens delete modal, calls deleteProductAction on confirm, and refreshes", async () => {
    const user = userEvent.setup();
    deleteProductAction.mockResolvedValue({ ok: true });

    render(<ProductsList products={[product]} categories={categories} />);

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(
      screen.getByRole("heading", { name: "Excluir produto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Remover permanentemente “Camisa básica”/),
    ).toBeInTheDocument();

    const confirmDelete = screen
      .getAllByRole("button", { name: "Excluir" })
      .find((el) => el.className.includes("bg-red-600"));
    expect(confirmDelete).toBeTruthy();
    await user.click(confirmDelete as HTMLButtonElement);

    await waitFor(() => {
      expect(deleteProductAction).toHaveBeenCalledWith(1);
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows delete error when delete fails", async () => {
    const user = userEvent.setup();
    deleteProductAction.mockResolvedValue({ ok: false, error: "Sem permissão." });

    render(<ProductsList products={[product]} categories={categories} />);

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    const confirmDelete = screen
      .getAllByRole("button", { name: "Excluir" })
      .find((el) => el.className.includes("bg-red-600"));
    await user.click(confirmDelete as HTMLButtonElement);

    expect(await screen.findByText("Sem permissão.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("links Novo produto to /products/new", () => {
    render(<ProductsList products={[]} categories={categories} />);
    expect(screen.getByRole("link", { name: "Novo produto" })).toHaveAttribute(
      "href",
      "/products/new",
    );
  });
});
