import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const { id } = await params; const body = await request.json();
    const where = user.role === "SUPER_ADMIN" ? { id } : { id, tenantId: scope.tenantId! };
    const existing = await prisma.vehicle.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    if (body.driverId) { const driver = await prisma.user.findFirst({ where: { id: String(body.driverId), tenantId: existing.tenantId, role: "DRIVER", isActive: true } }); if (!driver) return NextResponse.json({ error: "Driver must belong to this workspace and be active." }, { status: 400 }); }
    const vehicle = await prisma.vehicle.update({ where: { id }, data: { ...(body.registration !== undefined ? { registration: String(body.registration).trim().toUpperCase() } : {}), ...(body.type !== undefined ? { type: String(body.type).trim() } : {}), ...(body.capacity !== undefined ? { capacity: String(body.capacity).trim() || null } : {}), ...(body.status !== undefined && ["AVAILABLE", "IN_SERVICE", "INACTIVE"].includes(String(body.status)) ? { status: String(body.status) } : {}) } });
    return NextResponse.json({ data: vehicle });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try { const { id } = await params; const where = user.role === "SUPER_ADMIN" ? { id } : { id, tenantId: scope.tenantId! }; const existing = await prisma.vehicle.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 }); await prisma.vehicle.update({ where: { id }, data: { status: "INACTIVE" } }); return NextResponse.json({ ok: true }); }
  catch (error) { return jsonError(error); }
}
