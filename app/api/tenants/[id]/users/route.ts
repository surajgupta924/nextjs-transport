import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN"]); if (response || !user) return response;
  try { const { id } = await params; const data = await prisma.user.findMany({ where: { tenantId: id, role: "TENANT_ADMIN" }, select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true }, orderBy: { createdAt: "asc" } }); return NextResponse.json({ data }); }
  catch (error) { return jsonError(error); }
}
