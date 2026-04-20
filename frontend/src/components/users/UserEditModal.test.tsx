import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserRow } from "@/components/users/user-types";

const updateUserAction = vi.fn();

vi.mock("@/app/actions/users", () => ({
  updateUserAction: (...a: unknown[]) => updateUserAction(...a),
}));

import UserEditModal from "./UserEditModal";

describe("UserEditModal", () => {
  const userRow: UserRow = {
    id: 3,
    email: "edit@test.co",
    first_name: "Ed",
    last_name: "It",
    is_active: true,
  };

  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    updateUserAction.mockReset();
    onClose.mockReset();
    onSaved.mockReset();
  });

  it("submits update and closes on success", async () => {
    const u = userEvent.setup();
    updateUserAction.mockResolvedValue({ ok: true });

    render(
      <UserEditModal
        user={userRow}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
      />,
    );

    const fields = screen.getAllByRole("textbox");
    const emailInput = fields.find((el) => (el as HTMLInputElement).type === "email");
    expect(emailInput).toBeTruthy();
    await u.clear(emailInput as HTMLInputElement);
    await u.type(emailInput as HTMLInputElement, "updated@test.co");

    await u.click(screen.getAllByRole("button", { name: "Salvar alterações" })[0]);

    await waitFor(() => {
      expect(updateUserAction).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          email: "updated@test.co",
          is_active: true,
        }),
      );
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error when update fails", async () => {
    const u = userEvent.setup();
    updateUserAction.mockResolvedValue({ ok: false, error: "E-mail inválido." });

    render(<UserEditModal user={userRow} isOpen onClose={onClose} onSaved={onSaved} />);

    await u.click(screen.getAllByRole("button", { name: "Salvar alterações" })[0]);

    expect(await screen.findByText("E-mail inválido.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
