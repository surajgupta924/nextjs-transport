import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser, tenantIdOrError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try { const data = await prisma.payrollEntry.findMany({ where: user.role === "SUPER_ADMIN" ? {} : { tenantId: scope.tenantId! }, include: { user: { select: { name: true, email: true, role: true } } }, orderBy: [{ period: "desc" }, { createdAt: "desc" }] }); return NextResponse.json({ data }); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const employeeName = String(body.employeeName ?? "").trim(); const period = String(body.period ?? "").trim(); const amount = Number(body.amount); const userId = String(body.userId ?? "");
    if (!employeeName || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Employee, valid month (YYYY-MM) and positive amount are required." }, { status: 400 });
    let employee = null; if (userId) { employee = await prisma.user.findFirst({ where: { id: userId, tenantId: scope.tenantId!, role: { in: ["DRIVER", "TENANT_ADMIN"] }, isActive: true } }); if (!employee) return NextResponse.json({ error: "Choose an active employee from this workspace." }, { status: 400 }); }
    const data = await prisma.payrollEntry.create({ data: { tenantId: scope.tenantId!, userId: employee?.id ?? null, employeeName: employee?.name ?? employeeName, period, amount, note: String(body.note ?? "").trim() || null } }); return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(["TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try { const body = await request.json(); const id = String(body.id ?? ""); const entry = await prisma.payrollEntry.findFirst({ where: { id, tenantId: scope.tenantId! } }); if (!entry) return NextResponse.json({ error: "Payroll entry not found." }, { status: 404 }); return NextResponse.json({ data: await prisma.payrollEntry.update({ where: { id }, data: { status: "PAID" } }) }); }
  catch (error) { return jsonError(error); }
}
