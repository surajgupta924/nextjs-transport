"use client";
import { FormEvent, useState } from "react";
import { Truck, ShieldCheck, ArrowRight } from "lucide-react";
import Swal from "@/lib/swal";

export default function SetupPage() {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const form = new FormData(e.currentTarget); const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not create platform owner.");
      await Swal.fire({ icon: "success", title: "Platform owner created", text: "Sign in with your new account to continue.", confirmButtonColor: "#23292f", customClass: { popup: "fleet-swal" } });
      window.location.assign("/login");
    } catch (error) { Swal.fire({ icon: "error", title: "Setup failed", text: error instanceof Error ? error.message : "Try again.", confirmButtonColor: "#23292f", customClass: { popup: "fleet-swal" } }); }
    finally { setBusy(false); }
  }
  return <main className="login-page setup-page"><div className="login-form-side"><div className="login-card"><div className="mobile-login-brand"><span className="brand-mark"><Truck size={19}/></span><span>fleetflow<span className="brand-period">.</span></span></div><div className="login-welcome">ONE TIME SETUP</div><h2>Create your platform account.</h2><p className="login-subtitle">This first account can provision and manage all client workspaces.</p><form onSubmit={submit} className="setup-form"><label htmlFor="setup-name">Your name</label><input id="setup-name" name="name" placeholder="Your full name" required minLength={2}/><label htmlFor="setup-email">Work email</label><input id="setup-email" name="email" type="email" placeholder="you@yourbusiness.com" required/><label htmlFor="setup-password">Password</label><input id="setup-password" name="password" type="password" placeholder="At least 12 characters" required minLength={12}/><label htmlFor="setup-confirm">Confirm password</label><input id="setup-confirm" name="confirmPassword" type="password" placeholder="Enter password again" required minLength={12}/><button className="login-submit" disabled={busy}>{busy ? "Creating account…" : <>Create platform owner <ArrowRight size={16}/></>}</button></form><div className="login-security"><ShieldCheck size={14}/><span>Passwords are securely hashed before storage.</span></div></div></div><div className="login-art"><div className="login-art-brand"><span className="brand-mark"><Truck size={20}/></span><span>fleetflow<span className="brand-period">.</span></span></div><div className="login-art-copy"><div className="login-badge"><span/> YOUR TRANSPORT WORKSPACE</div><h1>Make every<br/>business move<br/><em>in sync.</em></h1><p>Set up your platform. Bring your clients on board. Give every workspace a home of its own.</p></div><div className="login-art-footer"><span>© 2025 FleetFlow</span><span><ShieldCheck size={13}/> Secure workspace</span></div></div></main>;
}

