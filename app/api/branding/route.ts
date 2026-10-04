import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser(); if (response || !user) return response;
  if (!user.tenantId) return NextResponse.json({ data: null });
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { logoData: true, logoUrl: true, accentColor: true } });
    return NextResponse.json({ data: tenant }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return jsonError(error); }
}
