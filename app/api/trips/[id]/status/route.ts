import { NextResponse } from "next/server";
import { TripStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "DRIVER"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const { id } = await params; const body = await request.json(); const status = String(body.status ?? "").toUpperCase();
    if (!(Object.values(TripStatus) as string[]).includes(status)) return NextResponse.json({ error: "Choose a valid shipment status." }, { status: 400 });
    const where = user.role === "SUPER_ADMIN" ? { reference: id } : user.role === "DRIVER" ? { reference: id, tenantId: scope.tenantId!, driverId: user.id } : { reference: id, tenantId: scope.tenantId! };
    const existing = await prisma.trip.findFirst({ where }); if (!existing) return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    if (user.role === "DRIVER" && !["IN_TRANSIT", "DELIVERED"].includes(status)) return NextResponse.json({ error: "Drivers can only start or deliver assigned shipments." }, { status: 403 });
    if (user.role === "DRIVER" && status === "DELIVERED") return NextResponse.json({ error: "Close delivery from POD / Delivery Closure so recipient proof is recorded." }, { status: 400 });
    if (user.role === "DRIVER" && status === "IN_TRANSIT" && existing.status !== "PENDING") return NextResponse.json({ error: "Only pending shipments can be started." }, { status: 409 });
    if (user.role === "DRIVER" && status === "DELIVERED" && existing.status !== "IN_TRANSIT") return NextResponse.json({ error: "Mark the shipment in transit before delivery." }, { status: 409 });
    const data = await prisma.trip.update({ where: { id: existing.id }, data: { status: status as TripStatus, ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}) } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}
