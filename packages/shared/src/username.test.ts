import { describe, expect, it } from "vitest";
import { isValidUsername } from "./username";

describe("isValidUsername", () => {
  it("accepts every length from 1 to 30", () => {
    for (const n of [1, 2, 3, 29, 30]) {
      expect(isValidUsername("a".repeat(n)), `length ${n}`).toBe(true);
    }
  });
  it("rejects empty and over-long", () => {
    expect(isValidUsername("")).toBe(false);
    expect(isValidUsername("a".repeat(31))).toBe(false);
  });
  it("allows interior hyphens only", () => {
    expect(isValidUsername("a-b")).toBe(true);
    expect(isValidUsername("-ab")).toBe(false);
    expect(isValidUsername("ab-")).toBe(false);
    expect(isValidUsername("-")).toBe(false);
  });
  it("rejects uppercase and other characters", () => {
    expect(isValidUsername("Jack")).toBe(false);
    expect(isValidUsername("a_b")).toBe(false);
    expect(isValidUsername("a b")).toBe(false);
  });
});
