import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function requireUser(roles?: string[]) {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  if (user.tenant && !user.tenant.isActive) return { user: null, response: NextResponse.json({ error: "This workspace is suspended. Contact platform support." }, { status: 403 }) };
  if (roles && !roles.includes(user.role)) return { user: null, response: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 }) };
  return { user, response: null };
}

export function tenantIdOrError(user: { role: string; tenantId: string | null }) {
  if (user.role === "SUPER_ADMIN") return { tenantId: null, response: null };
  if (!user.tenantId) return { tenantId: null, response: NextResponse.json({ error: "This account has no business workspace." }, { status: 403 }) };
  return { tenantId: user.tenantId, response: null };
}

export function jsonError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
