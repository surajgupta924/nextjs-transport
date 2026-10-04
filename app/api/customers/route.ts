import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, requireUser, tenantIdOrError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const where = user.role === "SUPER_ADMIN" ? {} : user.role === "CUSTOMER" ? { tenantId: scope.tenantId!, userId: user.id } : { tenantId: scope.tenantId! };
    const data = await prisma.customer.findMany({ where, include: { user: { select: { id: true, isActive: true } }, _count: { select: { trips: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId!;
    const name = String(body.name ?? "").trim(); const email = String(body.email ?? "").trim().toLowerCase(); const phone = String(body.phone ?? "").trim();
    if (!tenantId || name.length < 2 || (!email && !phone)) return NextResponse.json({ error: "Choose a workspace, customer name, and email or phone." }, { status: 400 });
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    const createLogin = Boolean(body.createLogin);
    if (createLogin && (!email || String(body.password ?? "").length < 10)) return NextResponse.json({ error: "Customer login needs an email and password of at least 10 characters." }, { status: 400 });
    const data = await prisma.$transaction(async (tx) => {
      let account = null;
      if (createLogin) account = await tx.user.create({ data: { tenantId, name, email, phone: phone || null, passwordHash: hashPassword(String(body.password)), role: Role.CUSTOMER, firstLogin: true } });
      return tx.customer.create({ data: { tenantId, name, email: email || null, phone: phone || null, address: String(body.address ?? "").trim() || null, gstin: String(body.gstin ?? "").trim() || null, notes: String(body.notes ?? "").trim() || null, userId: account?.id ?? null } });
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This email already has a login." }, { status: 409 }); return jsonError(error); }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const id = String(body.id ?? "");
    const where = user.role === "SUPER_ADMIN" ? { id } : { id, tenantId: scope.tenantId! };
    const existing = await prisma.customer.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const customer = await prisma.customer.update({ where: { id }, data: { ...(body.name !== undefined ? { name: String(body.name).trim() } : {}), ...(body.email !== undefined ? { email: String(body.email).trim().toLowerCase() || null } : {}), ...(body.phone !== undefined ? { phone: String(body.phone).trim() || null } : {}), ...(body.address !== undefined ? { address: String(body.address).trim() || null } : {}), ...(body.gstin !== undefined ? { gstin: String(body.gstin).trim() || null } : {}), ...(body.notes !== undefined ? { notes: String(body.notes).trim() || null } : {}), ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}) } });
    return NextResponse.json({ data: customer });
  } catch (error) { return jsonError(error); }
}
