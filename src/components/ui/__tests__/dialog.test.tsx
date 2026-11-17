import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Dialog } from "../dialog";

afterEach(cleanup);

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open payment dialog</button>
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Payment confirmation">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Dialog>
    </>
  );
}

describe("Dialog keyboard focus management", () => {
  it("traps Tab from the dialog container and restores focus on close", async () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open payment dialog" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = await screen.findByRole("dialog", { name: "Payment confirmation" });
    await waitFor(() => expect(dialog).toHaveFocus());

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Last action" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("dismisses on Escape and restores focus to the opener", async () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open payment dialog" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = await screen.findByRole("dialog", { name: "Payment confirmation" });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(dialog).toHaveAttribute("aria-modal", "true");

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
