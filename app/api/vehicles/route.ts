import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, tenantIdOrError, jsonError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "DRIVER"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try { const data = await prisma.vehicle.findMany({ where: user.role === "SUPER_ADMIN" ? {} : { tenantId: scope.tenantId! }, select: { id: true, tenantId: true, registration: true, type: true, capacity: true, status: true, createdAt: true, trips: { where: { status: { in: ["PENDING", "IN_TRANSIT"] } }, take: 1, select: { id: true, driver: { select: { name: true } } } } }, orderBy: { registration: "asc" }, take: 500 }); return NextResponse.json({ data }); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
  if (response || !user) return response;
  const scope = tenantIdOrError(user);
  if (scope.response) return scope.response;
  try {
    const body = await request.json(); const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId!;
    if (Array.isArray(body.items)) {
      if (body.items.length > 500) return NextResponse.json({ error: "Import is limited to 500 vehicles per file." }, { status: 400 });
      if (body.items.some((item: unknown) => !item || typeof item !== "object" || Array.isArray(item))) return NextResponse.json({ error: "The import contains an invalid row." }, { status: 400 });
      const items = body.items.map((item: Record<string, unknown>) => ({ registration: String(item.registration ?? "").trim().toUpperCase(), type: String(item.type ?? "").trim(), capacity: String(item.capacity ?? "").trim() || null }));
      if (!tenantId || items.some((item: { registration: string; type: string }) => !item.registration || !item.type)) return NextResponse.json({ error: "Every imported row needs registration and vehicle type." }, { status: 400 });
      if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
      if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
      const result = await prisma.vehicle.createMany({ data: items.map((item: { registration: string; type: string; capacity: string | null }) => ({ ...item, tenantId })), skipDuplicates: true });
      return NextResponse.json({ created: result.count, skipped: items.length - result.count });
    }
    const registration = String(body.registration ?? "").trim().toUpperCase(); const type = String(body.type ?? "").trim();
    if (!tenantId || !registration || !type) return NextResponse.json({ error: "Workspace, registration and vehicle type are required." }, { status: 400 });
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    const vehicle = await prisma.vehicle.create({ data: { tenantId, registration, type, capacity: String(body.capacity ?? "").trim() || null, status: "AVAILABLE" } });
    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This registration is already added." }, { status: 409 }); return jsonError(error); }
}
