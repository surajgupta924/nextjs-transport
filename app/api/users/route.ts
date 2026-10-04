import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";
import { Role } from "@prisma/client";

export async function GET() {
  const { user, response } = await requireUser();
  if (response || !user) return response;
  if (user.role === "CUSTOMER") return NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 });
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const users = await prisma.user.findMany({ where: scope.tenantId ? { tenantId: scope.tenantId, role: { not: "SUPER_ADMIN" } } : { role: "TENANT_ADMIN" }, select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, tenantId: true, createdAt: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: users });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const body = await request.json();
    const role = String(body.role ?? "").toUpperCase();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!(Object.values(Role) as string[]).includes(role) || role === "SUPER_ADMIN") return NextResponse.json({ error: "Choose a valid team role." }, { status: 400 });
    if (user.role !== "SUPER_ADMIN" && role === "TENANT_ADMIN" && !body.allowAdmin) return NextResponse.json({ error: "Only the platform owner can add another workspace admin." }, { status: 403 });
    const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Choose a workspace." }, { status: 400 });
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) return NextResponse.json({ error: "Enter a valid email and a password of at least 10 characters." }, { status: 400 });
    const name = String(body.name ?? "").trim(); if (name.length < 2) return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    const created = await prisma.user.create({ data: { name, email, phone: String(body.phone ?? "").trim() || null, passwordHash: hashPassword(password), role: role as Role, tenantId }, select: { id: true, name: true, email: true, role: true, phone: true, tenantId: true } });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This email already has an account." }, { status: 409 }); return jsonError(error); }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const id = String(body.id ?? "");
    const where = user.role === "SUPER_ADMIN" ? { id, role: "TENANT_ADMIN" as const } : { id, tenantId: scope.tenantId!, role: "TENANT_ADMIN" as const };
    const existing = await prisma.user.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Workspace admin not found." }, { status: 404 });
    const updated = await prisma.user.update({ where: { id }, data: { ...(body.name !== undefined ? { name: String(body.name).trim() } : {}), ...(body.phone !== undefined ? { phone: String(body.phone).trim() || null } : {}), ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}) }, select: { id: true, name: true, email: true, role: true, isActive: true } });
    return NextResponse.json({ data: updated });
  } catch (error) { return jsonError(error); }
}
