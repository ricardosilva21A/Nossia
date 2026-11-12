// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickClose } from "./QuickClose";
import { AffectionSheet } from "./HouseSheets";
import { WallCalendar } from "./WallCalendar";

afterEach(cleanup);

describe("closing a date in three taps", () => {
  it("saves how it went without a photo and offers to write more", async () => {
    const onSave = vi.fn(async () => true);
    const onWriteMore = vi.fn();
    render(<QuickClose title="Jantar no Vira" emoji="🍝" onSave={onSave} onWriteMore={onWriteMore} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Adorámos/ }));
    fireEvent.click(screen.getByRole("button", { name: "Sem foto" }));
    await waitFor(() => expect(screen.getByText("Guardado nas memórias")).toBeTruthy());
    expect(onSave).toHaveBeenCalledWith(5, null);
    fireEvent.click(screen.getByRole("button", { name: "Escrever mais" }));
    expect(onWriteMore).toHaveBeenCalled();
  });

  it("closes with Escape", () => {
    const onClose = vi.fn();
    render(<QuickClose title="Cinema" emoji="🎬" onSave={async () => true} onWriteMore={() => {}} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("sending affection", () => {
  it("says when the other one won't get a notification", async () => {
    const onSend = vi.fn(async () => true);
    render(<AffectionSheet name="Marta" look={null} notified={false} onSend={onSend} onClose={() => {}} />);
    expect(screen.getByText(/Marta ainda não tem as notificações ligadas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Um beijo/ }));
    await waitFor(() => expect(screen.getByText("Enviado a Marta")).toBeTruthy());
    expect(onSend).toHaveBeenCalledWith("beijo");
  });
});

describe("the wall calendar", () => {
  it("picks a day and offers to plan a date on it", () => {
    const onPlanDay = vi.fn();
    render(<WallCalendar today={new Date(2026, 10, 12)} dates={[{ title: "Jantar", planned_for: "2026-11-14" }]} commitments={[]} trips={[]} onOpenAgenda={() => {}} onPlanDay={onPlanDay} />);
    fireEvent.click(screen.getByRole("button", { name: /^14 de Novembro/ }));
    expect(screen.getByText("Jantar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Marcar date a 14" }));
    expect(onPlanDay).toHaveBeenCalledWith("2026-11-14");
  });
});
