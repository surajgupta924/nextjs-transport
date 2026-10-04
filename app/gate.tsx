"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Gate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false); const path = usePathname(); const router = useRouter(); const [session, setSession] = useState(false);
  useEffect(() => {
    if (path === "/setup") { fetch("/api/setup").then(async (r) => { const d = await r.json(); if (!d.setupRequired) router.replace("/login"); else setReady(true); }).catch(() => setReady(true)); return; }
    if (path === "/login") { fetch("/api/auth/me").then(async (r) => { if (r.ok) router.replace("/"); else { const d = await fetch("/api/setup").then((x) => x.json()); if (d.setupRequired) router.replace("/setup"); else setReady(true); } }).catch(() => setReady(true)); return; }
    if (path === "/") { setReady(true); return; }
    fetch("/api/auth/me").then((r) => { if (!r.ok) router.replace("/login"); else { setSession(true); setReady(true); } }).catch(() => router.replace("/login"));
  }, [path, router]);
  if (!ready) return <div className="app-loading"><span className="loading-mark">F</span><span>Getting your workspace ready…</span></div>;
  return <div data-session={session ? "active" : "guest"}>{children}</div>;
}
