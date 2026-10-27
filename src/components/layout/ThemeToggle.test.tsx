import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "./ThemeToggle";

const theme = vi.hoisted(() => ({ resolvedTheme: "dark", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => theme }));

describe("ThemeToggle", () => {
  beforeEach(() => {
    theme.setTheme.mockClear();
  });

  it("offers the light mode while the dark one is on, and switches to it", async () => {
    theme.resolvedTheme = "dark";
    render(<ThemeToggle />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Mudar para o modo claro" }));

    expect(theme.setTheme).toHaveBeenCalledWith("light");
  });

  it("offers the dark mode while the light one is on, and switches to it", async () => {
    theme.resolvedTheme = "light";
    render(<ThemeToggle />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Mudar para o modo escuro" }));

    expect(theme.setTheme).toHaveBeenCalledWith("dark");
  });
});
