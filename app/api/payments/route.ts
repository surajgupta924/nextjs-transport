import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (response || !user) return response;
  if (user.role === "DRIVER") return NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 });
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const where = user.role === "SUPER_ADMIN" ? {} : { tenantId: scope.tenantId! };
    const data = await prisma.payment.findMany({ where: user.role === "CUSTOMER" ? { ...where, trip: { OR: [{ customerEmail: user.email }, { customer: { userId: user.id } }] } } : where, include: { tenant: { select: { name: true, logoUrl: true } }, trip: { select: { customerEmail: true, customer: { select: { userId: true } } } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const body = await request.json(); const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId!;
    const amount = Number(body.amount); const invoiceNumber = String(body.invoiceNumber ?? "").trim(); const description = String(body.description ?? "").trim();
    if (!tenantId || !invoiceNumber || !description || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invoice number, description and a positive amount are required." }, { status: 400 });
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    let tripId: string | null = null;
    if (body.tripId) { const trip = await prisma.trip.findFirst({ where: { id: String(body.tripId), tenantId } }); if (!trip) return NextResponse.json({ error: "Shipment not found in this workspace." }, { status: 400 }); tripId = trip.id; }
    if (body.status === "PAID" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Invoices must be created unpaid. Mark them paid after collecting payment." }, { status: 400 });
    const payment = await prisma.payment.create({ data: { tenantId, tripId, invoiceNumber, description, amount, status: body.status === "PAID" ? "PAID" : "DUE", dueDate: body.dueDate ? new Date(body.dueDate) : null, paidAt: body.status === "PAID" ? new Date() : null } });
    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This invoice number already exists." }, { status: 409 }); return jsonError(error); }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const body = await request.json(); const id = String(body.id ?? "");
    const where = user.role === "SUPER_ADMIN" ? { id } : { id, tenantId: scope.tenantId! };
    const found = await prisma.payment.findFirst({ where }); if (!found) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.status === "OVERDUE") return NextResponse.json({ error: "Use paid status only; due invoices become overdue after their due date." }, { status: 400 });
    const data = await prisma.payment.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}
