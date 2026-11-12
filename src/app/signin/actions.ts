"use server";

import { signIn, testLoginEnabled } from "@/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/" });
}

export async function signInAsTestUser(formData: FormData) {
  if (!testLoginEnabled) throw new Error("Test login is disabled");
  await signIn("test-login", { login: String(formData.get("login") ?? ""), redirectTo: "/" });
}
