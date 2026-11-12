import { describe, expect, it } from "vitest";
import { askHowItWentAt, proposalMessage, proposalsForMe, waitingOnPartner } from "./proposals";

const base = { status: "planned", planned_for: "2026-11-14", proposal: "proposed" as const };

describe("date proposals", () => {
  it("lists only the other one's open proposals, soonest first", () => {
    const dates = [
      { ...base, id: "late", planned_for: "2026-11-20", proposed_by: "ricardo" },
      { ...base, id: "mine", proposed_by: "marta" },
      { ...base, id: "soon", proposed_by: "ricardo" },
      { ...base, id: "past", planned_for: "2026-11-01", proposed_by: "ricardo" },
      { ...base, id: "ok", proposal: "confirmed" as const, proposed_by: "ricardo" },
    ];
    expect(proposalsForMe(dates, "marta", "2026-11-12").map((date) => date.id)).toEqual(["soon", "late"]);
    expect(waitingOnPartner(dates[1], "marta")).toBe(true);
    expect(waitingOnPartner(dates[0], "marta")).toBe(false);
  });

  it("says who proposed what and when", () => {
    expect(proposalMessage("proposed", "Ricardo", "Jantar no Vira", "2026-11-14", "20:00:00")).toEqual({ title: "💌 Ricardo propôs um date", body: "Jantar no Vira · sábado, 14 de novembro, 20:00. Aceitas?" });
    expect(proposalMessage("accepted", "Marta", "Cinema", "2026-11-15", null).title).toBe("✅ Marta aceitou o date");
  });

  it("asks how it went an hour after the date should have ended", () => {
    expect(askHowItWentAt("2026-11-14", "20:00", 120)).toEqual({ date: "2026-11-14", minutes: 20 * 60 + 180 });
    expect(askHowItWentAt("2026-11-14", "10:00", null)?.minutes).toBe(600 + 180);
    expect(askHowItWentAt("2026-11-14", null, 90)).toBeNull();
  });
});
