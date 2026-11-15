import { describe, expect, it } from "vitest";
import { parseLeadLogins, resolveRole } from "@/lib/auth/roles";

describe("parseLeadLogins", () => {
  it("parses a comma-separated allowlist, trimming and lowercasing", () => {
    expect(parseLeadLogins(" Alice, bob ,,CAROL ")).toEqual(new Set(["alice", "bob", "carol"]));
  });

  it("returns an empty set when unset", () => {
    expect(parseLeadLogins(undefined)).toEqual(new Set());
  });
});

describe("resolveRole", () => {
  const leads = new Set(["alice"]);

  it("gives the lead role to allowlisted logins, case-insensitively", () => {
    expect(resolveRole("Alice", leads)).toBe("lead");
  });

  it("defaults everyone else to engineer (least privilege)", () => {
    expect(resolveRole("mallory", leads)).toBe("engineer");
  });
});
