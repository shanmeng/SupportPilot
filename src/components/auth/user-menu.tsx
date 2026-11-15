import type { SessionUser } from "@/lib/auth/authorization";

type UserMenuProps = {
  user: SessionUser;
  signOutAction: () => Promise<void>;
};

const ROLE_LABEL: Record<SessionUser["role"], string> = { engineer: "Engineer", lead: "Lead" };

export function UserMenu({ user, signOutAction }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="text-sm font-semibold">{user.name ?? "Signed in"}</p>
        <p className="text-xs text-[#557089]">
          <span className="rounded-md bg-[#edf4fb] px-1.5 py-0.5">{ROLE_LABEL[user.role]}</span>
        </p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-[9px] border border-[#dde5f0] bg-white px-3 py-2 text-sm font-semibold text-[#182539] hover:bg-[#f2f5fa] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f6b442]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
