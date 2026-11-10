import { describe, expect, it } from "vitest";
import { describeOpportunity, findOpportunities, findVacationWindows } from "./holidays";

const names = { partner_one: "Ricardo", partner_two: "Marta" };

describe("fixed company holidays", () => {
  // Marta is away Monday 8 to Friday 12 March 2027; Ricardo works Monday to Friday.
  const rules = { away: { partner_two: [{ starts_on: "2027-03-08", ends_on: "2027-03-12" }] } };

  it("says how many days the other needs to join them", () => {
    const [window] = findVacationWindows("2027-01-01", "2027-12-31", [], null, rules);
    expect(window).toMatchObject({ start: "2027-03-06", end: "2027-03-14", days: 9, awayFor: "partner_two" });
    expect(window.leave).toHaveLength(5);
    expect(describeOpportunity(window, names)).toBe("Marta tem férias. Se Ricardo tirar 5 dias, têm 9 dias seguidos, de 6 de março a 14 de março.");
  });

  it("counts a holiday inside the period as free for both", () => {
    // 25 April 2027 is a Sunday, so use 1 December 2027, a Wednesday.
    const [window] = findVacationWindows("2027-01-01", "2027-12-31", [], null, { away: { partner_two: [{ starts_on: "2027-11-29", ends_on: "2027-12-03" }] } });
    expect(window.leave).toHaveLength(4);
  });

  it("notices when both are away together", () => {
    const both = { away: { partner_one: [{ starts_on: "2027-03-08", ends_on: "2027-03-12" }], partner_two: [{ starts_on: "2027-03-08", ends_on: "2027-03-12" }] } };
    const [window] = findVacationWindows("2027-01-01", "2027-12-31", [], null, both);
    expect(window.leave).toEqual([]);
    expect(describeOpportunity(window, names)).toBe("Estão os dois de férias de 6 de março a 14 de março: 9 dias seguidos.");
  });

  it("warns when the leave falls in a month the other avoids", () => {
    const [window] = findVacationWindows("2027-01-01", "2027-12-31", [], null, { ...rules, avoidMonths: { partner_one: [3] } });
    expect(window.awkward).toEqual(["partner_one"]);
    expect(describeOpportunity(window, names)).toContain("março é um mês difícil para Ricardo");
  });

  it("ignores periods outside the window", () => {
    expect(findVacationWindows("2027-04-01", "2027-12-31", [], null, rules)).toEqual([]);
  });
});

describe("bridges with holiday rules", () => {
  it("needs no leave from someone already away", () => {
    // 8 December 2026 is a Tuesday; Marta is away on Monday 7.
    const [found] = findOpportunities("2026-12-07", "2026-12-09", [], null, { away: { partner_two: [{ starts_on: "2026-12-07", ends_on: "2026-12-07" }] } });
    expect(found.leave).toEqual([{ date: "2026-12-07", who: ["partner_one"] }]);
  });

  it("drops a bridge that needs leave in a month someone avoids", () => {
    expect(findOpportunities("2026-12-07", "2026-12-09", [], null, { avoidMonths: { partner_one: [12] } })).toEqual([]);
  });

  it("still offers long weekends that need no leave in an avoided month", () => {
    // 1 May 2026 is a Friday.
    expect(findOpportunities("2026-04-30", "2026-05-02", [], null, { avoidMonths: { partner_one: [5] } })).toHaveLength(1);
  });
});
