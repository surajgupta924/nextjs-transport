import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "DRIVER"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try { const data = await prisma.vehicle.findMany({ where: user.role === "SUPER_ADMIN" ? {} : { tenantId: scope.tenantId! }, include: { trips: { where: { status: { in: ["PENDING", "IN_TRANSIT"] } }, select: { id: true } } }, orderBy: { registration: "asc" } }); return NextResponse.json({ data }); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const body = await request.json(); const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId!;
    const registration = String(body.registration ?? "").trim().toUpperCase(); const type = String(body.type ?? "").trim();
    if (!tenantId || !registration || !type) return NextResponse.json({ error: "Workspace, registration and vehicle type are required." }, { status: 400 });
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    const vehicle = await prisma.vehicle.create({ data: { tenantId, registration, type, capacity: String(body.capacity ?? "").trim() || null, status: "AVAILABLE" } });
    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This registration is already added." }, { status: 409 }); return jsonError(error); }
}
