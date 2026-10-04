import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser, tenantIdOrError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "DRIVER", "CUSTOMER"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const where = user.role === "SUPER_ADMIN" ? {} : user.role === "DRIVER" ? { tenantId: scope.tenantId!, driverId: user.id } : user.role === "CUSTOMER" ? { tenantId: scope.tenantId!, OR: [{ customerEmail: user.email }, { customer: { userId: user.id } }] } : { tenantId: scope.tenantId! };
    const data = await prisma.trip.findMany({ where: { ...where, status: "DELIVERED" }, select: { id: true, reference: true, customerName: true, origin: true, destination: true, deliveredAt: true, deliveryReceivedBy: true, podNote: true, podImageData: true, driver: { select: { name: true } } }, orderBy: { deliveredAt: "desc" } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["TENANT_ADMIN", "DRIVER"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const reference = String(body.reference ?? ""); const receivedBy = String(body.receivedBy ?? "").trim(); const note = String(body.note ?? "").trim(); const image = String(body.image ?? "");
    if (!reference || !receivedBy || (!note && !image)) return NextResponse.json({ error: "Shipment, recipient name and a note or proof photo are required." }, { status: 400 });
    if (image && (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(image) || image.length > 2_800_000)) return NextResponse.json({ error: "Proof photo must be a PNG, JPEG or WebP under 2 MB." }, { status: 400 });
    const where = user.role === "DRIVER" ? { reference, tenantId: scope.tenantId!, driverId: user.id, status: "IN_TRANSIT" as const } : { reference, tenantId: scope.tenantId!, status: "IN_TRANSIT" as const };
    const trip = await prisma.trip.findFirst({ where }); if (!trip) return NextResponse.json({ error: "Only an in-transit shipment assigned to you can be closed." }, { status: 404 });
    const data = await prisma.trip.update({ where: { id: trip.id }, data: { status: "DELIVERED", deliveredAt: new Date(), deliveryReceivedBy: receivedBy, podNote: note || null, podImageData: image || null } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}
