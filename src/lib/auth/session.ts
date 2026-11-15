import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { apiError } from "@/lib/api/errors";
import { toSessionUser, type SessionUser } from "./authorization";

export async function getSessionUser(): Promise<SessionUser | null> {
  return toSessionUser(await auth());
}

/** For route handlers: the signed-in user, or a ready-to-return 401 response. */
export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: apiError(401, "unauthorized", "Sign in to use this endpoint.") } as const;
  }
  return { user, response: null } as const;
}

/** For server components: the signed-in user, or a redirect to the sign-in page. */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}
