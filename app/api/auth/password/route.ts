import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { user, response } = await requireUser(); if (response || !user) return response;
  try {
    const body = await request.json(); const currentPassword = String(body.currentPassword ?? ""); const newPassword = String(body.newPassword ?? "");
    if (newPassword.length < 12) return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!account || !verifyPassword(currentPassword, account.passwordHash)) return NextResponse.json({ error: "Current password does not match." }, { status: 400 });
    await prisma.$transaction([prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword), firstLogin: false } }), prisma.session.deleteMany({ where: { userId: user.id } })]);
    const res = NextResponse.json({ ok: true }); res.cookies.delete("fleetflow_session"); res.cookies.delete("fleetflow_session_hint"); return res;
  } catch (error) { console.error(error); return NextResponse.json({ error: "Could not update password." }, { status: 500 }); }
}
