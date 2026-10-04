import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const { id } = await params;
    const where = user.role === "SUPER_ADMIN" ? { id } : user.role === "CUSTOMER" ? { id, tenantId: scope.tenantId!, userId: user.id } : { id, tenantId: scope.tenantId! };
    const customer = await prisma.customer.findFirst({ where, include: { trips: { orderBy: { createdAt: "desc" }, take: 100, include: { driver: { select: { name: true, phone: true } }, vehicle: true } } } });
    return customer ? NextResponse.json({ data: customer }) : NextResponse.json({ error: "Customer not found." }, { status: 404 });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const { id } = await params; const where = user.role === "SUPER_ADMIN" ? { id } : { id, tenantId: scope.tenantId! };
    const existing = await prisma.customer.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    await prisma.$transaction(async (tx) => { await tx.customer.update({ where: { id }, data: { isActive: false } }); if (existing.userId) { await tx.user.update({ where: { id: existing.userId }, data: { isActive: false } }); await tx.session.deleteMany({ where: { userId: existing.userId } }); } });
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
