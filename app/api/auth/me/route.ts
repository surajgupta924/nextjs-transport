import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ data: null }, { status: 401 });
  return NextResponse.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, firstLogin: user.firstLogin, tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name, logoUrl: user.tenant.logoUrl, accentColor: user.tenant.accentColor } : null } });
}
