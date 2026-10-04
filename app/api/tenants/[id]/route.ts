import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(); if (response || !user) return response;
  const { id } = await params;
  if (user.role !== "SUPER_ADMIN" && user.tenantId !== id) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  try { const tenant = await prisma.tenant.findUnique({ where: { id }, include: { _count: { select: { users: true, trips: true, vehicles: true, payments: true } } } }); if (!tenant) return NextResponse.json({ error: "Workspace not found." }, { status: 404 }); return NextResponse.json({ data: tenant }); }
  catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN", "TENANT_ADMIN"]); if (response || !user) return response;
  const { id } = await params;
  if (user.role !== "SUPER_ADMIN" && user.tenantId !== id) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.slug !== undefined && user.role === "SUPER_ADMIN") data.slug = String(body.slug).trim().toLowerCase();
    if (body.phone !== undefined) data.phone = String(body.phone).trim() || null;
    if (body.address !== undefined) data.address = String(body.address).trim() || null;
    if (body.logoData !== undefined) {
      const logo = String(body.logoData ?? "");
      if (logo && (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(logo) || logo.length > 2_800_000)) return NextResponse.json({ error: "Logo must be a PNG, JPEG or WebP under 2 MB." }, { status: 400 });
      data.logoData = logo || null;
    }
    if (body.accentColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.accentColor))) data.accentColor = body.accentColor;
    if (user.role === "SUPER_ADMIN") {
      if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
      if (["STARTER", "GROWTH", "BUSINESS"].includes(String(body.plan))) data.plan = body.plan;
      if (body.paidAmount !== undefined && Number.isFinite(Number(body.paidAmount))) data.paidAmount = Number(body.paidAmount);
      if (body.email !== undefined) data.email = String(body.email).trim().toLowerCase() || null;
    }
    const tenant = await prisma.tenant.update({ where: { id }, data }); return NextResponse.json({ data: tenant });
  } catch (error) { return jsonError(error); }
}
