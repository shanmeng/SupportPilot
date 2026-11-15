import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));

import { GET } from "@/app/api/v1/me/route";

const user = {
  id: "8f6c1a52-0d7e-4d8a-9a43-2f7d0b1e9c11",
  name: "Octo Engineer",
  email: "octo@example.test",
  image: null,
  role: "engineer",
};

describe("GET /api/v1/me", () => {
  beforeEach(() => authMock.mockReset());

  it("returns 401 with the standard error body when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "unauthorized", message: "Sign in to use this endpoint." },
    });
  });

  it("returns 401 for a malformed session instead of trusting it", async () => {
    authMock.mockResolvedValue({ user: { ...user, role: "superuser" }, expires: "2099-01-01T00:00:00.000Z" });

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns the signed-in user's id, name and role", async () => {
    authMock.mockResolvedValue({ user, expires: "2099-01-01T00:00:00.000Z" });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      image: null,
      role: "engineer",
    });
  });
});
