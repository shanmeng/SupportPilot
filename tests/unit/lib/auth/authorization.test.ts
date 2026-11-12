import { describe, expect, it } from "vitest";
import { canAccessInvestigation, toSessionUser, type SessionUser } from "@/lib/auth/authorization";

const engineer: SessionUser = {
  id: "8f6c1a52-0d7e-4d8a-9a43-2f7d0b1e9c11",
  name: "Eng",
  email: null,
  image: null,
  role: "engineer",
};
const lead: SessionUser = { ...engineer, id: "1b0f6f3e-5d0c-4c9e-8e8b-4a3c2d1e0f99", role: "lead" };

describe("toSessionUser", () => {
  it("accepts a well-formed session", () => {
    expect(toSessionUser({ user: engineer, expires: "2099-01-01T00:00:00.000Z" })).toEqual(engineer);
  });

  it.each([
    ["no session", null],
    ["session without user", { expires: "2099-01-01T00:00:00.000Z" }],
    ["user without id", { user: { ...engineer, id: undefined } }],
    ["user with non-uuid id", { user: { ...engineer, id: "admin" } }],
    ["user with unknown role", { user: { ...engineer, role: "superuser" } }],
    ["user without role", { user: { ...engineer, role: undefined } }],
  ])("rejects an invalid session: %s", (_label, session) => {
    expect(toSessionUser(session)).toBeNull();
  });
});

describe("canAccessInvestigation", () => {
  it("lets an engineer access their own investigation", () => {
    expect(canAccessInvestigation(engineer, engineer.id)).toBe(true);
  });

  it("denies an engineer another user's investigation", () => {
    expect(canAccessInvestigation(engineer, lead.id)).toBe(false);
  });

  it("lets a lead access any investigation", () => {
    expect(canAccessInvestigation(lead, engineer.id)).toBe(true);
  });
});
