import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/components/common/PageBreadCrumb", () => ({
  default: () => null,
}));

const { toastSuccess, toastError, toastDismiss, moveCategoryAction } = vi.hoisted(
  () => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    toastDismiss: vi.fn(),
    moveCategoryAction: vi.fn(),
  }),
);

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
    dismiss: toastDismiss,
  },
}));

vi.mock("@/app/actions/categories", () => ({
  createCategoryAction: vi.fn().mockResolvedValue({
    ok: true,
    category: { id: 99, name: "x", parent_id: null },
  }),
  deleteCategoryAction: vi.fn().mockResolvedValue({ ok: true }),
  moveCategoryAction,
  reorderCategorySiblingsAction: vi.fn().mockResolvedValue({ ok: true }),
  updateCategoryAction: vi.fn().mockResolvedValue({
    ok: true,
    category: { id: 1, name: "x", parent_id: null },
  }),
}));

vi.mock("../CategoryTreeSection", () => ({
  CategoryTreeSection: ({
    onDrop,
    onSaveCreateChild,
  }: {
    onDrop: (draggedId: number, parentId: number | null) => void;
    onSaveCreateChild: (parentId: number) => void | Promise<void>;
  }) => (
    <div>
      <button type="button" onClick={() => onDrop(2, null)}>
        move-to-root
      </button>
      <button
        type="button"
        onClick={() => {
          void onSaveCreateChild(1);
        }}
      >
        save-empty-child
      </button>
    </div>
  ),
}));

import CategoriesManager from "../CategoriesManager";
import type { CategoryTreeNode } from "../types";

describe("CategoriesManager toasts", () => {
  const initialTree: CategoryTreeNode[] = [
    {
      id: 1,
      name: "Parent",
      parent_id: null,
      subcategories: [
        {
          id: 2,
          name: "Child",
          parent_id: 1,
          subcategories: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    refresh.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastDismiss.mockReset();
    moveCategoryAction.mockReset();
    moveCategoryAction.mockResolvedValue({ ok: true });
  });

  it("dismisses existing toasts then shows success toast when move succeeds", async () => {
    const user = userEvent.setup();
    render(<CategoriesManager initialTree={initialTree} />);

    await user.click(screen.getByRole("button", { name: "move-to-root" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        "Categoria movida com sucesso.",
        { duration: 3000 },
      );
    });
    expect(toastDismiss).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("shows error toast when move fails", async () => {
    moveCategoryAction.mockResolvedValue({
      ok: false,
      error: "Falha na API",
    });
    const user = userEvent.setup();
    render(<CategoriesManager initialTree={initialTree} />);

    await user.click(screen.getByRole("button", { name: "move-to-root" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Falha na API", {
        duration: 5000,
      });
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows validation error toast when saving empty subcategory name", async () => {
    const user = userEvent.setup();
    render(<CategoriesManager initialTree={initialTree} />);

    await user.click(screen.getByRole("button", { name: "save-empty-child" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Informe um nome para a subcategoria.",
        { duration: 5000 },
      );
    });
  });
});
