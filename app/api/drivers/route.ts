import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, requireUser, tenantIdOrError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN", "DRIVER"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const where = user.role === "SUPER_ADMIN" ? { role: Role.DRIVER } : user.role === "DRIVER" ? { id: user.id } : { tenantId: scope.tenantId!, role: Role.DRIVER };
    const data = await prisma.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, isActive: true, tenantId: true, createdAt: true, _count: { select: { assignedTrips: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return NextResponse.json({ data });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const tenantId = user.role === "SUPER_ADMIN" ? String(body.tenantId ?? "") : scope.tenantId!;
    if (Array.isArray(body.items)) {
      if (body.items.length > 200) return NextResponse.json({ error: "Driver import is limited to 200 rows." }, { status: 400 });
      if (body.items.some((item: unknown) => !item || typeof item !== "object" || Array.isArray(item))) return NextResponse.json({ error: "The import contains an invalid row." }, { status: 400 });
      const initialPassword = String(body.initialPassword ?? "");
      const items = body.items.map((item: Record<string, unknown>) => ({ name: String(item.name ?? "").trim(), email: String(item.email ?? "").trim().toLowerCase(), phone: String(item.phone ?? "").trim() || null }));
      if (!tenantId || initialPassword.length < 10 || items.some((item: { name: string; email: string }) => item.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))) return NextResponse.json({ error: "Each driver needs a name and valid email. Set a temporary password of at least 10 characters." }, { status: 400 });
      if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
      if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
      const passwordHash = hashPassword(initialPassword);
      const result = await prisma.user.createMany({ data: items.map((item: { name: string; email: string; phone: string | null }) => ({ ...item, tenantId, passwordHash, role: Role.DRIVER, firstLogin: true })), skipDuplicates: true });
      return NextResponse.json({ created: result.count, skipped: items.length - result.count });
    }
    const name = String(body.name ?? "").trim(); const email = String(body.email ?? "").trim().toLowerCase(); const password = String(body.password ?? "");
    if (!tenantId || name.length < 2 || !email || password.length < 10) return NextResponse.json({ error: "Workspace, name, email, and password (10+ characters) are required." }, { status: 400 });
    if (user.role === "SUPER_ADMIN" && !await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (user.role === "TENANT_ADMIN" && body.tenantId && body.tenantId !== user.tenantId) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    const data = await prisma.user.create({ data: { tenantId, name, email, phone: String(body.phone ?? "").trim() || null, passwordHash: hashPassword(password), role: Role.DRIVER, firstLogin: true } });
    return NextResponse.json({ data: { id: data.id, name: data.name, email: data.email, phone: data.phone, isActive: data.isActive } }, { status: 201 });
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This email already has an account." }, { status: 409 }); return jsonError(error); }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const scope = tenantIdOrError(user); if (scope.response) return scope.response;
  try {
    const body = await request.json(); const id = String(body.id ?? "");
    const where = user.role === "SUPER_ADMIN" ? { id, role: Role.DRIVER } : { id, tenantId: scope.tenantId!, role: Role.DRIVER };
    const driver = await prisma.user.findFirst({ where }); if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    const updated = await prisma.user.update({ where: { id }, data: { ...(body.name !== undefined ? { name: String(body.name).trim() } : {}), ...(body.phone !== undefined ? { phone: String(body.phone).trim() || null } : {}), ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}) }, select: { id: true, name: true, email: true, phone: true, isActive: true } });
    if (body.isActive === false) await prisma.session.deleteMany({ where: { userId: id } });
    return NextResponse.json({ data: updated });
  } catch (error) { return jsonError(error); }
}
