import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(["SUPER_ADMIN"]); if (response || !user) return response;
  try {
    const { id } = await params; const body = await request.json(); const isActive = Boolean(body.isActive);
    const tenant = await prisma.tenant.update({ where: { id }, data: { isActive } });
    if (!isActive) await prisma.session.deleteMany({ where: { user: { tenantId: id } } });
    return NextResponse.json({ data: tenant });
  } catch (error) { return jsonError(error); }
}
