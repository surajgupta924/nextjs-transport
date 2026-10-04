import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { user, response } = await requireUser(); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const url = new URL(request.url); const fromParam = url.searchParams.get("from"); const toParam = url.searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toParam ? new Date(toParam) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to || to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "Choose a valid date range of up to 12 months." }, { status: 400 });
    const base = user.role === "SUPER_ADMIN" ? {} : { tenantId: scope.tenantId! };
    const tripScope = user.role === "DRIVER" ? { ...base, driverId: user.id } : user.role === "CUSTOMER" ? { ...base, OR: [{ customerEmail: user.email }, { customer: { userId: user.id } }] } : base;
    const paymentScope = user.role === "CUSTOMER" ? { ...base, OR: [{ trip: { customerEmail: user.email } }, { trip: { customer: { userId: user.id } } }] } : base;
    const [byStatus, revenue, shipments, tenants] = await Promise.all([
      prisma.trip.groupBy({ by: ["status"], where: { ...tripScope, createdAt: { gte: from, lte: to } }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ["status"], where: { ...paymentScope, createdAt: { gte: from, lte: to } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.trip.findMany({ where: { ...tripScope, createdAt: { gte: from, lte: to } }, select: { reference: true, customerName: true, origin: true, destination: true, status: true, amount: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 500 }),
      user.role === "SUPER_ADMIN" ? prisma.tenant.findMany({ select: { id: true, name: true, plan: true, isActive: true, paidAmount: true, createdAt: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    ]);
    return NextResponse.json({ data: { range: { from, to }, shipments: { byStatus, rows: shipments }, payments: revenue, tenants } });
  } catch (error) { return jsonError(error); }
}
