import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza o texto e responde a clique", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmar</Button>);

    const button = screen.getByRole("button", { name: "Confirmar" });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("não dispara clique quando desabilitado", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Confirmar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
