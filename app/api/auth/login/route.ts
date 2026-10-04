import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookie = jar.get("fleetflow_login_attempt")?.value;
    const attempts = Number(cookie ?? 0);
    if (attempts >= 8) return NextResponse.json({ error: "Too many attempts. Wait 15 minutes, then try again." }, { status: 429 });
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
    if (!user || !user.isActive || (user.tenant && !user.tenant.isActive) || !verifyPassword(password, user.passwordHash)) { const failed = NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 }); failed.cookies.set("fleetflow_login_attempt", String(attempts + 1), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 15 * 60 }); return failed; }
    await createSession(user.id);
    const success = NextResponse.json({ data: { id: user.id, name: user.name, role: user.role, tenantId: user.tenantId, firstLogin: user.firstLogin } }); success.cookies.delete("fleetflow_login_attempt"); return success;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not sign in. Check database configuration." }, { status: 500 });
  }
}
