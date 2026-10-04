import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const where = user.role === "SUPER_ADMIN" ? {} : user.role === "DRIVER" ? { tenantId: scope.tenantId!, driverId: user.id } : user.role === "CUSTOMER" ? { tenantId: scope.tenantId!, OR: [{ customerEmail: user.email }, { customer: { userId: user.id } }] } : { tenantId: scope.tenantId! };
    const trips = await prisma.trip.findMany({ where, include: { driver: { select: { id: true, name: true, phone: true } }, vehicle: true, customer: true, tenant: { select: { id: true, name: true, logoUrl: true, accentColor: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: trips });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "CUSTOMER"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const body = await request.json();
    const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId!;
    let customerName = String(body.customerName ?? "").trim();
    const origin = String(body.origin ?? "").trim();
    const destination = String(body.destination ?? "").trim();
    const amount = Number(body.amount);
    if (!tenantId || (user.role !== "CUSTOMER" && !customerName && !body.customerId) || !origin || !destination || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Workspace, customer, route and a positive amount are required." }, { status: 400 });
    if (user.role !== "CUSTOMER" && body.driverId) { const driver = await prisma.user.findFirst({ where: { id: String(body.driverId), tenantId, role: "DRIVER", isActive: true } }); if (!driver) return NextResponse.json({ error: "Choose an active driver in this workspace." }, { status: 400 }); }
    if (user.role !== "CUSTOMER" && body.vehicleId) { const vehicle = await prisma.vehicle.findFirst({ where: { id: String(body.vehicleId), tenantId } }); if (!vehicle) return NextResponse.json({ error: "Choose a vehicle in this workspace." }, { status: 400 }); }
    let customerId: string | null = null; let customerEmail = String(body.customerEmail ?? "").trim().toLowerCase() || null;
    if (user.role === "CUSTOMER") { const customer = await prisma.customer.findFirst({ where: { tenantId, userId: user.id, isActive: true } }); if (!customer) return NextResponse.json({ error: "Customer profile not found." }, { status: 403 }); customerId = customer.id; customerName = customer.name; customerEmail = customer.email; }
    else if (body.customerId) { const customer = await prisma.customer.findFirst({ where: { id: String(body.customerId), tenantId, isActive: true } }); if (!customer) return NextResponse.json({ error: "Choose a customer in this workspace." }, { status: 400 }); customerId = customer.id; customerName = customer.name; customerEmail = customer.email; }
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    const trip = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
      const count = await tx.trip.count({ where: { tenantId } });
      const reference = `TR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
      return tx.trip.create({ data: { tenantId, reference, customerId, customerName, customerEmail, origin, destination, cargo: String(body.cargo ?? "").trim() || null, amount, pickupAt: body.pickupAt ? new Date(body.pickupAt) : null, pickupContact: String(body.pickupContact ?? "").trim() || null, pickupPhone: String(body.pickupPhone ?? "").trim() || null, deliveryContact: String(body.deliveryContact ?? "").trim() || null, deliveryPhone: String(body.deliveryPhone ?? "").trim() || null, notes: String(body.notes ?? "").trim() || null, driverId: user.role === "CUSTOMER" ? null : body.driverId || null, vehicleId: user.role === "CUSTOMER" ? null : body.vehicleId || null }, include: { driver: true, vehicle: true, customer: true } });
    });
    return NextResponse.json({ data: trip }, { status: 201 });
  } catch (error) { return jsonError(error); }
}

