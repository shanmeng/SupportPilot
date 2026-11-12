import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserMenu } from "@/components/auth/user-menu";

const user = {
  id: "8f6c1a52-0d7e-4d8a-9a43-2f7d0b1e9c11",
  name: "Octo Engineer",
  email: null,
  image: null,
  role: "engineer" as const,
};

describe("UserMenu", () => {
  it("shows the user's name, role and a sign-out button", () => {
    render(<UserMenu user={user} signOutAction={async () => {}} />);
    expect(screen.getByText("Octo Engineer")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("labels leads", () => {
    render(<UserMenu user={{ ...user, role: "lead" }} signOutAction={async () => {}} />);
    expect(screen.getByText("Lead")).toBeInTheDocument();
  });

  it("falls back to a generic label when the name is missing", () => {
    render(<UserMenu user={{ ...user, name: null }} signOutAction={async () => {}} />);
    expect(screen.getByText("Signed in")).toBeInTheDocument();
  });
});
