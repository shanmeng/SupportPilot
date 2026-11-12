import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { parseLeadLogins, resolveRole, type Role } from "@/lib/auth/roles";
import { upsertGitHubUser, type GitHubProfile } from "@/lib/db/users-repository";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; name?: string | null; email?: string | null; image?: string | null };
  }
}

/** Fixed test accounts for Playwright. Only available when the test login is explicitly enabled. */
const TEST_USERS: Record<string, GitHubProfile> = {
  "e2e-engineer": { githubId: "test:e2e-engineer", login: "e2e-engineer", name: "E2E Engineer", email: null, avatarUrl: null },
  "e2e-lead": { githubId: "test:e2e-lead", login: "e2e-lead", name: "E2E Lead", email: null, avatarUrl: null },
};

/** Never in production, even if the variable is set by mistake. */
export const testLoginEnabled =
  process.env.AUTH_TEST_LOGIN === "enabled" && process.env.VERCEL_ENV !== "production";

const providers: NextAuthConfig["providers"] = [GitHub];
if (testLoginEnabled) {
  providers.push(
    Credentials({
      id: "test-login",
      name: "Test login",
      credentials: { login: { label: "Test user", type: "text" } },
      authorize: async (credentials) => {
        const profile = TEST_USERS[String(credentials?.login ?? "")];
        return profile ? { id: profile.githubId, name: profile.name, email: profile.email } : null;
      },
    }),
  );
}

function profileFromSignIn(
  provider: string,
  user: { id?: string; name?: string | null; email?: string | null; image?: string | null },
  githubProfile: Record<string, unknown> | undefined,
): GitHubProfile | null {
  if (provider === "github" && githubProfile) {
    return {
      githubId: String(githubProfile.id),
      login: String(githubProfile.login),
      name: user.name ?? null,
      email: user.email ?? null,
      avatarUrl: user.image ?? null,
    };
  }
  if (provider === "test-login" && user.id) {
    return Object.values(TEST_USERS).find((u) => u.githubId === user.id) ?? null;
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/signin" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Runs with `account` only at sign-in: persist the user and pin id + role into the signed JWT.
      if (account && user) {
        const githubProfile = profileFromSignIn(account.provider, user, profile as Record<string, unknown> | undefined);
        if (!githubProfile) throw new Error("Unsupported sign-in provider");
        const role = resolveRole(githubProfile.login, parseLeadLogins(process.env.LEAD_GITHUB_LOGINS));
        const row = await upsertGitHubUser(githubProfile, role);
        token.userId = row.id;
        token.role = row.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.userId ?? "");
      session.user.role = token.role as Role;
      return session;
    },
  },
});
