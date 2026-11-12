import { Suspense } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { requirePageUser } from "@/lib/auth/session";
import { signOutAction } from "./actions";

/** Server-side gate: renders only for a valid session, otherwise redirects to /signin. */
async function Dashboard() {
  const user = await requirePageUser();
  return (
    <>
      <header className="flex h-[66px] items-center justify-between border-b border-[#e1e7f0] bg-white px-4 sm:px-7">
        <p className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden="true" className="rounded-lg bg-[#2459d3] px-2 py-1 text-white">
            ✦
          </span>
          SupportPilot
        </p>
        <UserMenu user={user} signOutAction={signOutAction} />
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-2 px-4 py-8 sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight">SupportPilot</h1>
        <p className="text-sm text-[#75839a]">
          Agentic RAG technical support assistant. The dashboard is built in US-03.
        </p>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-[66px] border-b border-[#e1e7f0] bg-white" />}>
      <Dashboard />
    </Suspense>
  );
}
