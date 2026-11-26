// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { inviteCodeFrom } from "./CoupleSetup";

describe("pasting an invite", () => {
  it("takes the whole link or just the code", () => {
    const code = "0123456789abcdef0123456789abcdef";
    expect(inviteCodeFrom(`https://nossia.vercel.app/join/${code}`)).toBe(code);
    expect(inviteCodeFrom(` ${code} `)).toBe(code);
    expect(inviteCodeFrom("https://nossia.vercel.app/hoje")).toBeNull();
    expect(inviteCodeFrom("olá")).toBeNull();
  });
});
