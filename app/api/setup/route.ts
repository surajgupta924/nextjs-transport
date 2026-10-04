import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  try { const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } }); return NextResponse.json({ setupRequired: count === 0 }); }
  catch { return NextResponse.json({ setupRequired: false, error: "Database is unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const existingUser = await requireUser(["SUPER_ADMIN"]);
    if (existingUser.user) return NextResponse.json({ error: "Platform setup is already complete." }, { status: 409 });
    const existingAdmin = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (existingAdmin) return NextResponse.json({ error: "Platform setup is already complete." }, { status: 409 });
    const body = await request.json();
    const name = String(body.name ?? "").trim(); const email = String(body.email ?? "").trim().toLowerCase(); const password = String(body.password ?? "");
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password !== String(body.confirmPassword ?? "")) return NextResponse.json({ error: "Enter a valid name, email and matching password of at least 12 characters." }, { status: 400 });
    const user = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(782316405)`;
      const count = await tx.user.count({ where: { role: "SUPER_ADMIN" } });
      if (count !== 0) throw new Error("SETUP_COMPLETE");
      return tx.user.create({ data: { name, email, passwordHash: hashPassword(password), role: "SUPER_ADMIN" } });
    });
    return NextResponse.json({ data: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) { if (error instanceof Error && error.message === "SETUP_COMPLETE") return NextResponse.json({ error: "Platform setup is already complete." }, { status: 409 }); console.error(error); return NextResponse.json({ error: "Could not set up the platform. Confirm the database is connected." }, { status: 500 }); }
}
