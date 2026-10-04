import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const { id } = await params; const body = await request.json();
    const where = user.role === "SUPER_ADMIN" ? { reference: id } : { reference: id, tenantId: scope.tenantId! };
    const trip = await prisma.trip.findFirst({ where }); if (!trip) return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    const data: { driverId?: string | null; vehicleId?: string | null } = {};
    if (body.driverId !== undefined) { if (body.driverId) { const driver = await prisma.user.findFirst({ where: { id: String(body.driverId), tenantId: trip.tenantId, role: "DRIVER", isActive: true } }); if (!driver) return NextResponse.json({ error: "Driver must be active and belong to this workspace." }, { status: 400 }); data.driverId = driver.id; } else data.driverId = null; }
    if (body.vehicleId !== undefined) { if (body.vehicleId) { const vehicle = await prisma.vehicle.findFirst({ where: { id: String(body.vehicleId), tenantId: trip.tenantId, status: { not: "INACTIVE" } } }); if (!vehicle) return NextResponse.json({ error: "Vehicle must belong to this workspace." }, { status: 400 }); data.vehicleId = vehicle.id; } else data.vehicleId = null; }
    return NextResponse.json({ data: await prisma.trip.update({ where: { id: trip.id }, data, include: { driver: true, vehicle: true } }) });
  } catch (error) { return jsonError(error); }
}
