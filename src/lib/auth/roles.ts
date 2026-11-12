export const ROLES = ["engineer", "lead"] as const;
export type Role = (typeof ROLES)[number];

/** Parses the `LEAD_GITHUB_LOGINS` allowlist (comma-separated GitHub logins). */
export function parseLeadLogins(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Least privilege: only allowlisted logins are leads; everyone else is an engineer. */
export function resolveRole(githubLogin: string, leadLogins: Set<string>): Role {
  return leadLogins.has(githubLogin.toLowerCase()) ? "lead" : "engineer";
}
