# FleetFlow

Responsive multi-tenant transport management app built with Next.js App Router, PostgreSQL and Prisma.

## Run locally

1. Install Node.js 20.9 or later. Set `DATABASE_URL` and a random `SESSION_SECRET` in `.env.local` (the provided Neon URL is configured there).
2. Install project dependencies: `npm install`.
3. Install/generate Prisma: `npm install prisma @prisma/client` then `npx prisma generate`.
4. Create PostgreSQL tables: `npx prisma migrate dev --name init`.
5. Start the app: `npm run dev`, then open `http://localhost:3000`.

Open `/setup` once to create the platform Super Admin. The Super Admin creates client workspaces from **Clients > Add client**. Tenant admins add drivers, customers and customer logins. Temporary passwords must be changed at first sign-in.

## Role pages

- **Super Admin:** platform dashboard, client workspaces, reports and settings.
- **Tenant Admin:** dashboard, customers, fleet management, staff, payroll, booking requests, shipments/assignments, live tracking, POD/deliveries, trip expenses, transport receipts, reports, help, notifications and workspace settings.
- **Driver:** dashboard, assigned shipments, start trip, expenses, live deliveries and delivery closure with recipient/POD proof.
- **Customer:** dashboard, create shipment, shipment list, live tracking, POD history and transport receipts.

Operational data is served through role-gated JSON API routes. Workspace records and sessions are tenant-scoped. The schema includes vehicles, shipments, invoices, trip expenses, payroll and delivery proof.

## Operational notes

Use `npx prisma migrate dev --name init` locally and `npx prisma migrate deploy` in deployments. Keep Neon URLs in `.env.local` or deployment secrets, never source control. The database URL was shared in chat; rotate its password in Neon and update `.env.local` before deployment. Logo and delivery images are currently stored as small data URLs; move them to object storage for production. Add transactional email, audit logs, automated backups and observability before a wider rollout.

