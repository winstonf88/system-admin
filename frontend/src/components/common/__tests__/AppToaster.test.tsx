import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" as const, toggleTheme: vi.fn() }),
}));

vi.mock("sonner", () => ({
  Toaster: (props: {
    position?: string;
    theme?: string;
    richColors?: boolean;
    closeButton?: boolean;
  }) => (
    <div
      data-testid="sonner-toaster"
      data-position={props.position}
      data-theme={props.theme}
      data-rich-colors={String(props.richColors)}
      data-close-button={String(props.closeButton)}
    />
  ),
}));

import { AppToaster } from "../AppToaster";

describe("AppToaster", () => {
  it("renders Sonner Toaster at top-center with theme from context", () => {
    render(<AppToaster />);

    const el = screen.getByTestId("sonner-toaster");
    expect(el).toHaveAttribute("data-position", "top-center");
    expect(el).toHaveAttribute("data-theme", "dark");
    expect(el).toHaveAttribute("data-rich-colors", "true");
    expect(el).toHaveAttribute("data-close-button", "true");
  });
});
