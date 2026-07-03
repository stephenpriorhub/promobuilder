/**
 * OxfordHub user identification for Promo Builder.
 *
 * The hub session cookie is domain-scoped to .oxfordhub.app, so the browser
 * sends it with every request to builder.oxfordhub.app. We forward it
 * server-side to the hub's /api/me (same pattern as promo-analyzer, mta-wiki,
 * iSpyEmails) to resolve {id, email, name, role}. Used to stamp the owner on
 * saved projects. Fail-closed on mutations; reads stay open.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const HUB_ME_URL =
  (process.env.HUB_URL ?? "https://oxfordhub.app") + "/api/me?projectId=promo-builder";

export type HubRole = "super_admin" | "exec_admin" | "admin" | "user";

export interface HubUser {
  id: string;
  email: string;
  name: string | null;
  role: HubRole;
}

/** Server-to-server maintenance bypass (scripts send x-hub-token). */
function serviceUser(req: NextRequest): HubUser | null {
  const token = req.headers.get("x-hub-token");
  const expected = process.env.HUB_API_TOKEN;
  if (!token || !expected || token !== expected) return null;
  return { id: "service", email: "service@oxfordhub.app", name: "Maintenance Script", role: "admin" };
}

/** Resolve the requesting user by forwarding their hub session cookie. */
export async function getHubUser(req: NextRequest): Promise<HubUser | null> {
  const svc = serviceUser(req);
  if (svc) return svc;
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  try {
    const res = await fetch(HUB_ME_URL, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated?: boolean;
      authorized?: boolean;
      user?: HubUser;
    };
    return data.authenticated && data.authorized && data.user ? data.user : null;
  } catch {
    return null;
  }
}

export function isHubAdmin(user: HubUser | null): boolean {
  return !!user && (user.role === "super_admin" || user.role === "exec_admin" || user.role === "admin");
}

export function forbidden(message = "Sign in to OxfordHub to use Promo Builder."): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
