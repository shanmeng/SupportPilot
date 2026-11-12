import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignInPanel } from "@/components/auth/sign-in-panel";

const noop = async () => {};

describe("SignInPanel", () => {
  it("offers GitHub sign-in", () => {
    render(<SignInPanel githubAction={noop} />);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to SupportPilot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
  });

  it("hides the test login unless it is enabled", () => {
    render(<SignInPanel githubAction={noop} />);
    expect(screen.queryByRole("button", { name: /test user/i })).not.toBeInTheDocument();
  });

  it("shows test-user buttons when the test login is enabled", () => {
    render(<SignInPanel githubAction={noop} testLoginAction={noop} />);
    expect(screen.getByRole("button", { name: "Sign in as test user: e2e-engineer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in as test user: e2e-lead" })).toBeInTheDocument();
  });

  it("shows an error message when sign-in failed", () => {
    render(<SignInPanel githubAction={noop} error="AccessDenied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed. Please try again.");
  });
});
