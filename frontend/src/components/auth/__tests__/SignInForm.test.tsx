import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import SignInForm from "../SignInForm";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
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

describe("SignInForm", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeAll(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    fetchSpy.mockClear();
  });

  it("toggles password visibility when the eye control is clicked", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    const passwordInput = screen.getByPlaceholderText("Digite sua senha");
    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows server error when login fails", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ detail: "E-mail ou senha inválidos." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SignInForm />);
    await user.type(
      screen.getByPlaceholderText("info@gmail.com"),
      "bad@test.co",
    );
    await user.type(screen.getByPlaceholderText("Digite sua senha"), "wrong");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("E-mail ou senha inválidos."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to home after successful login", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SignInForm />);
    await user.type(
      screen.getByPlaceholderText("info@gmail.com"),
      "good@test.co",
    );
    await user.type(
      screen.getByPlaceholderText("Digite sua senha"),
      "secret123",
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("sanitizes open-redirect targets after login", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    render(<SignInForm redirectTo="//evil.com/phish" />);
    await user.type(screen.getByPlaceholderText("info@gmail.com"), "u@test.co");
    await user.type(screen.getByPlaceholderText("Digite sua senha"), "pw");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/");
    });
  });
});
