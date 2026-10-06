import { describe, it } from "vitest";

// Must-test list from ARCHITECTURE-ESSENTIALS.md. Turn each todo into a real test
// as the matching function in lib/assignment.ts is built.

describe("computeGroupCount", () => {
  it.todo("60 active players → 10 groups");
  it.todo("12 active players → 4 groups (≥3 per pack)");
  it.todo("1 active player → 1 group");
  it.todo("never more groups than group options (4 custom names, 40 players → 4)");
  it.todo("override is used but capped at option count");
});

describe("assignBalanced", () => {
  it.todo("group sizes differ by at most 1 for N = 1–200");
  it.todo("uses every group when N ≥ G");
});

describe("pickSmallestGroup", () => {
  it.todo("returns the smallest group");
  it.todo("breaks ties with the lowest index");
});
