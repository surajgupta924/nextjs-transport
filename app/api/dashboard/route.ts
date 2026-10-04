import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  const currentUser = { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, firstLogin: user.firstLogin, tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name, logoUrl: user.tenant.logoUrl, accentColor: user.tenant.accentColor } : null };
  try {
    if (user.role === "SUPER_ADMIN") {
      const [tenantGroups, tripGroups, paid, recentTrips] = await Promise.all([
        prisma.tenant.groupBy({ by: ["isActive"], _count: { _all: true } }), prisma.trip.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
        prisma.trip.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, reference: true, customerName: true, origin: true, destination: true, status: true, amount: true, createdAt: true, driver: { select: { id: true, name: true, phone: true } }, vehicle: { select: { id: true, registration: true } } } }),
      ]);
      const tenantCount = tenantGroups.reduce((sum, item) => sum + item._count._all, 0); const activeTenants = tenantGroups.find(item => item.isActive)?._count._all ?? 0;
      const tripCount = tripGroups.reduce((sum, item) => sum + item._count._all, 0); const inTransit = tripGroups.find(item => item.status === "IN_TRANSIT")?._count._all ?? 0;
      return NextResponse.json({ data: { user: currentUser, metrics: { role: user.role, tenantCount, activeTenants, tripCount, inTransit, revenue: paid._sum.amount ?? 0 }, trips: recentTrips } });
    }
    const tenantId = scope.tenantId!;
    const tripWhere = user.role === "DRIVER" ? { tenantId, driverId: user.id } : user.role === "CUSTOMER" ? { tenantId, OR: [{ customerEmail: user.email }, { customer: { user: { id: user.id } } }] } : { tenantId };
    const paymentWhere = user.role === "CUSTOMER" ? { tenantId, OR: [{ trip: { customerEmail: user.email } }, { trip: { customer: { userId: user.id } } }] } : { tenantId };
    const [tripGroups, invoices, revenue, recentTrips] = await Promise.all([
      prisma.trip.groupBy({ by: ["status"], where: tripWhere, _count: { _all: true } }),
      prisma.payment.aggregate({ where: { ...paymentWhere, status: { in: ["DUE", "OVERDUE"] } }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { ...paymentWhere, status: "PAID" }, _sum: { amount: true } }),
      prisma.trip.findMany({ where: tripWhere, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, reference: true, customerName: true, origin: true, destination: true, status: true, amount: true, createdAt: true, driver: { select: { id: true, name: true, phone: true } }, vehicle: { select: { id: true, registration: true } } } }),
    ]);
    const tripCount = (status: string) => tripGroups.find(item => item.status === status)?._count._all ?? 0;
    const total = tripGroups.reduce((sum, item) => sum + item._count._all, 0); const pending = tripCount("PENDING"); const transit = tripCount("IN_TRANSIT"); const delivered = tripCount("DELIVERED");
    return NextResponse.json({ data: { user: currentUser, metrics: { role: user.role, tenant: currentUser.tenant, total, pending, inTransit: transit, delivered, outstanding: invoices._sum.amount ?? 0, outstandingCount: invoices._count, revenue: revenue._sum.amount ?? 0 }, trips: recentTrips } });
  } catch (error) { return jsonError(error); }
}
