import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserRow } from "@/components/users/user-types";

const createUser = vi.fn();
const deleteUser = vi.fn();
const getUsers = vi.fn();
const updateUser = vi.fn();
const { toastSuccess, toastError, toastDismiss } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastDismiss: vi.fn(),
}));

vi.mock("@/lib/api-client/users", () => ({
  createUser: (...a: unknown[]) => createUser(...a),
  deleteUser: (...a: unknown[]) => deleteUser(...a),
  getUsers: (...a: unknown[]) => getUsers(...a),
  updateUser: (...a: unknown[]) => updateUser(...a),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
    dismiss: toastDismiss,
  },
}));

import UsersManagement from "../UsersManagement";

describe("UsersManagement", () => {
  const users: UserRow[] = [
    {
      id: 1,
      email: "me@test.co",
      first_name: "Me",
      last_name: "User",
      is_active: true,
    },
    {
      id: 2,
      email: "other@test.co",
      first_name: "Other",
      last_name: "Person",
      is_active: true,
    },
  ];

  beforeEach(() => {
    createUser.mockReset();
    deleteUser.mockReset();
    getUsers.mockReset();
    updateUser.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastDismiss.mockReset();
  });

  it("disables delete for the current user row", () => {
    render(<UsersManagement users={users} currentUserId={1} />);
    const selfRow = screen.getByText("me@test.co").closest("tr");
    expect(selfRow).toBeTruthy();
    const selfDelete = within(selfRow as HTMLElement).getByRole("button", {
      name: "Excluir",
    });
    expect(selfDelete).toBeDisabled();

    const otherRow = screen.getByText("other@test.co").closest("tr");
    const otherDelete = within(otherRow as HTMLElement).getByRole("button", {
      name: "Excluir",
    });
    expect(otherDelete).not.toBeDisabled();
  });

  it("creates a user and refetches on success", async () => {
    const user = userEvent.setup();
    createUser.mockResolvedValue({ ok: true });
    getUsers.mockResolvedValue({ ok: true, data: users });

    render(<UsersManagement users={users} currentUserId={1} />);
    await user.click(screen.getByRole("button", { name: "Adicionar usuário" }));

    const emailInput = screen.getAllByRole("textbox")[0];
    await user.type(emailInput, "new@test.co");
    const passwordInput = document.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    await user.type(passwordInput, "password12");
    await user.click(screen.getByRole("button", { name: "Criar usuário" }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        email: "new@test.co",
        password: "password12",
        first_name: "",
        last_name: "",
        is_active: true,
      });
    });
    expect(getUsers).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith("Usuário criado com sucesso.", {
      duration: 3000,
    });
  });

  it("deletes another user when confirmed", async () => {
    const user = userEvent.setup();
    deleteUser.mockResolvedValue({ ok: true });

    render(<UsersManagement users={users} currentUserId={1} />);
    const table = screen.getByRole("table");
    const otherRow = within(table).getByText("other@test.co").closest("tr");
    await user.click(
      within(otherRow as HTMLElement).getByRole("button", { name: "Excluir" }),
    );

    const confirmDelete = screen
      .getAllByRole("button", { name: "Excluir" })
      .find((el) => el.className.includes("bg-red-600"));
    expect(confirmDelete).toBeTruthy();
    await user.click(confirmDelete as HTMLButtonElement);

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith(2);
    });
    expect(toastSuccess).toHaveBeenCalledWith("Usuário excluído com sucesso.", {
      duration: 3000,
    });
    expect(screen.queryByText("other@test.co")).not.toBeInTheDocument();
  });
});
