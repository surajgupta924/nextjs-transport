"use client";

import { FormEvent, useState } from "react";
import { Truck, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import Swal from "@/lib/swal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const result = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await result.json();
      if (!result.ok) throw new Error(body.error ?? "Could not sign in.");
      window.location.assign("/");
    } catch (error) { Swal.fire({ icon: "error", title: "Sign in failed", text: error instanceof Error ? error.message : "Please try again.", confirmButtonColor: "#23292f", customClass: { popup: "fleet-swal" } }); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><div className="login-art"><div className="login-art-brand"><span className="brand-mark"><Truck size={20}/></span><span>fleetflow<span className="brand-period">.</span></span></div><div className="login-art-copy"><div className="login-badge"><span/> THE TRANSPORT WORKSPACE</div><h1>Every delivery.<br/>A little more <em>in sync.</em></h1><p>One place for your fleet, your people and every promise you make along the way.</p><div className="login-art-stats"><div><strong>1,284</strong><small>shipments moving</small></div><i/><div><strong>99.2%</strong><small>on-time delivery</small></div></div></div><div className="login-art-route"><div className="route-map-grid"/><svg viewBox="0 0 540 210" preserveAspectRatio="none"><path d="M-20 155 C65 151 75 79 164 96 S244 153 308 100 S400 34 560 48" fill="none" stroke="#9cb2ff" strokeWidth="2" strokeDasharray="5 7"/><circle cx="163" cy="96" r="5" fill="#e6ad79" stroke="#fff" strokeWidth="3"/><circle cx="308" cy="100" r="5" fill="#71b69a" stroke="#fff" strokeWidth="3"/><circle cx="485" cy="48" r="5" fill="#e6ad79" stroke="#fff" strokeWidth="3"/></svg><div className="map-pin pin-one">MUMBAI</div><div className="map-pin pin-two">PUNE</div><div className="map-truck"><Truck size={17}/><span>On the move</span></div></div><div className="login-art-footer"><span>© 2025 FleetFlow</span><span><ShieldCheck size={13}/> Secure workspace</span></div></div><div className="login-form-side"><div className="login-card"><div className="mobile-login-brand"><span className="brand-mark"><Truck size={19}/></span><span>fleetflow<span className="brand-period">.</span></span></div><div className="login-welcome">WELCOME BACK</div><h2>Good to have you back.</h2><p className="login-subtitle">Sign in to your workspace to keep things moving.</p><form onSubmit={submit}><label htmlFor="email">Work email</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" required autoComplete="username"/><div className="password-label"><label htmlFor="password">Password</label><button type="button" onClick={() => Swal.fire({ title: "Password reset", text: "Please contact your workspace administrator to reset your password.", confirmButtonColor: "#23292f", customClass: { popup: "fleet-swal" } })}>Forgot password?</button></div><div className="password-input"><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password"/><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><button className="login-submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in to workspace <ArrowRight size={16}/></>}</button></form><div className="login-security"><ShieldCheck size={14}/><span>Your business data stays private and secure.</span></div></div><div className="login-legal"><span>Need a hand? <a href="mailto:support@fleetflow.app">Contact support</a></span><span>Privacy · Terms</span></div></div></main>;
}
