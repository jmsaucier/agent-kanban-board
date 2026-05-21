import { describe, expect, it } from "vitest";
import {
  composeItemId,
  generateShortSuffix,
  generateUniqueItemId,
} from "../src/ids/index.js";

const SUFFIX_PATTERN = /^[a-z0-9]{5,6}$/;

describe("ids", () => {
  describe("generateShortSuffix", () => {
    it("produces 5 or 6 lowercase alphanumeric characters", () => {
      for (let i = 0; i < 50; i++) {
        const suffix = generateShortSuffix();
        expect(suffix).toMatch(SUFFIX_PATTERN);
        expect(suffix.length === 5 || suffix.length === 6).toBe(true);
      }
    });
  });

  describe("composeItemId", () => {
    it("joins board id and suffix with hyphen", () => {
      expect(composeItemId("my-sprint", "k3m9x")).toBe("my-sprint-k3m9x");
    });
  });

  describe("generateUniqueItemId", () => {
    it("returns an id not in existingIds", () => {
      const existing = new Set(["my-sprint-aaaaa", "my-sprint-bbbbb"]);
      const id = generateUniqueItemId("my-sprint", existing);
      expect(id).toMatch(/^my-sprint-[a-z0-9]{5,6}$/);
      expect(existing.has(id)).toBe(false);
    });
  });
});
