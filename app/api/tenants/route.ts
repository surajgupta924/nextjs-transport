import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireUser, jsonError } from "@/lib/api-auth";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { user, response } = await requireUser(["SUPER_ADMIN"]);
  if (response || !user) return response;
  try {
    const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, slug: true, email: true, phone: true, address: true, accentColor: true, plan: true, paidAmount: true, isActive: true, createdAt: true, _count: { select: { users: true, trips: true } } } });
    return NextResponse.json({ data: tenants.map(({ _count, ...tenant }) => ({ ...tenant, userCount: _count.users, tripCount: _count.trips })) });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(["SUPER_ADMIN"]);
  if (response || !user) return response;
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const slug = slugify(String(body.slug ?? name));
    const planKey = String(body.plan ?? "STARTER").toUpperCase();
    const plan = ["STARTER", "GROWTH", "BUSINESS"].includes(planKey) ? planKey as "STARTER" | "GROWTH" | "BUSINESS" : "STARTER";
    if (name.length < 2 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !slug) return NextResponse.json({ error: "Enter a valid business name and owner email." }, { status: 400 });
    if (password.length < 10) return NextResponse.json({ error: "Set an initial password with at least 10 characters." }, { status: 400 });
    const logoData = String(body.logoData ?? "");
    if (logoData && (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(logoData) || logoData.length > 2_800_000)) return NextResponse.json({ error: "Logo must be a PNG, JPEG or WebP under 2 MB." }, { status: 400 });
    const tenant = await prisma.$transaction(async (tx) => {
      return tx.tenant.create({ data: {
        name, slug, email,
        phone: String(body.phone ?? "").trim() || null,
        address: String(body.address ?? "").trim() || null,
        logoData: logoData || null,
        accentColor: /^#[0-9a-fA-F]{6}$/.test(String(body.accentColor ?? "")) ? body.accentColor : "#2563eb",
        plan,
        paidAmount: Number.isFinite(Number(body.paidAmount)) ? Number(body.paidAmount) : 0,
        setupComplete: true,
        users: { create: { name: String(body.ownerName ?? name).trim(), email, passwordHash: hashPassword(password), role: "TENANT_ADMIN", phone: String(body.phone ?? "").trim() || null, firstLogin: true } },
      }, include: { users: { select: { id: true, name: true, email: true, role: true } } } });
    });
    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This workspace URL or owner email is already in use." }, { status: 409 });
    return jsonError(error);
  }
}
