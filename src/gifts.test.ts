import { describe, expect, it } from "vitest";
import { giftOccasions } from "./gifts";

describe("gift occasions", () => {
  it("lists the next birthday, anniversary and Christmas, soonest first", () => {
    const occasions = giftOccasions({ partnerName: "Marta", partnerBirthDate: "1998-03-02", relationshipDate: "2021-11-20" }, "2026-11-12");
    expect(occasions.map((occasion) => [occasion.key, occasion.date, occasion.days])).toEqual([
      ["anniversary", "2026-11-20", 8],
      ["christmas", "2026-12-25", 43],
      ["birthday", "2027-03-02", 110],
    ]);
    expect(occasions[2].label).toBe("Anos de Marta");
  });

  it("counts today as day zero and skips unknown dates", () => {
    const occasions = giftOccasions({ partnerName: "Marta", partnerBirthDate: null, relationshipDate: null }, "2026-12-25");
    expect(occasions).toEqual([{ key: "christmas", label: "Natal", date: "2026-12-25", days: 0 }]);
  });
});
