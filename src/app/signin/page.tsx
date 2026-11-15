import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { testLoginEnabled } from "@/auth";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { getSessionUser } from "@/lib/auth/session";
import { signInAsTestUser, signInWithGitHub } from "./actions";

export const metadata: Metadata = { title: "Sign in · SupportPilot" };

const testAction = testLoginEnabled ? signInAsTestUser : undefined;

async function SignInContent({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  if (await getSessionUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <SignInPanel
      githubAction={signInWithGitHub}
      testLoginAction={testAction}
      error={typeof error === "string" ? error : undefined}
    />
  );
}

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<SignInPanel githubAction={signInWithGitHub} testLoginAction={testAction} />}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
