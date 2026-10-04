import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const { id } = await params; const where = user.role === "SUPER_ADMIN" ? { id, role: "DRIVER" as const } : { id, tenantId: scope.tenantId!, role: "DRIVER" as const };
    const existing = await prisma.user.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    await prisma.$transaction([prisma.user.update({ where: { id }, data: { isActive: false } }), prisma.session.deleteMany({ where: { userId: id } })]);
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
