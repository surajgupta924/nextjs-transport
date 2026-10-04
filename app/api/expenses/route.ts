import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser, tenantIdOrError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "DRIVER"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const where = user.role === "SUPER_ADMIN" ? {} : user.role === "DRIVER" ? { tenantId: scope.tenantId!, driverId: user.id } : { tenantId: scope.tenantId! };
    const data = await prisma.tripExpense.findMany({ where, include: { trip: { select: { reference: true, origin: true, destination: true } }, driver: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["TENANT_ADMIN", "DRIVER"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const tripRef = String(body.tripReference ?? ""); const category = String(body.category ?? "").trim(); const amount = Number(body.amount);
    if (!tripRef || !category || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Choose a trip, expense category and positive amount." }, { status: 400 });
    const trip = await prisma.trip.findFirst({ where: user.role === "DRIVER" ? { reference: tripRef, tenantId: scope.tenantId!, driverId: user.id } : { reference: tripRef, tenantId: scope.tenantId! } });
    if (!trip) return NextResponse.json({ error: "Trip not found in your workspace." }, { status: 404 });
    const receiptData = String(body.receiptData ?? "");
    if (receiptData && (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(receiptData) || receiptData.length > 2_800_000)) return NextResponse.json({ error: "Receipt must be a PNG, JPEG or WebP under 2 MB." }, { status: 400 });
    const data = await prisma.tripExpense.create({ data: { tenantId: scope.tenantId!, tripId: trip.id, driverId: user.role === "DRIVER" ? user.id : trip.driverId ?? user.id, category, amount, note: String(body.note ?? "").trim() || null, receiptData: receiptData || null } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(["TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const id = String(body.id ?? ""); const status = String(body.status ?? "").toUpperCase();
    if (!["APPROVED", "REJECTED", "PAID"].includes(status)) return NextResponse.json({ error: "Choose approved, rejected or paid." }, { status: 400 });
    const found = await prisma.tripExpense.findFirst({ where: { id, tenantId: scope.tenantId! } }); if (!found) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    return NextResponse.json({ data: await prisma.tripExpense.update({ where: { id }, data: { status } }) });
  } catch (error) { return jsonError(error); }
}
