"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Pencil, Plus, RefreshCw, Search, Upload, Users, Truck } from "lucide-react";
import Swal from "@/lib/swal";
import { getCachedRows, loadRows, setCachedRows } from "@/lib/record-cache";

type Row = Record<string, unknown>;
type Kind = "vehicles" | "drivers" | "customers";
const labels: Record<Kind, string> = { vehicles: "Fleet Management", drivers: "Drivers", customers: "Customers" };
const routeFor: Record<Kind, string> = { vehicles: "/api/vehicles", drivers: "/api/drivers", customers: "/api/customers" };
const text = (value: unknown) => String(value ?? "");
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const active = (row: Row) => row.isActive !== false && row.status !== "INACTIVE";

function parseCsv(source: string) {
  const matrix: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && source[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) matrix.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) matrix.push(row);
  const headers = (matrix.shift() ?? []).map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  return matrix.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function normalizeRow(row: Row, kind: Kind) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), text(value).trim()]));
  const pick = (...keys: string[]) => keys.map((key) => normalized[key]).find(Boolean) ?? "";
  if (kind === "vehicles") return { registration: pick("registration", "reg", "vehicle", "vehiclenumber", "numberplate"), type: pick("type", "vehicletype", "model"), capacity: pick("capacity", "loadcapacity") };
  if (kind === "drivers") return { name: pick("name", "fullname", "drivername"), email: pick("email", "emailaddress"), phone: pick("phone", "mobile", "phonenumber") };
  return { name: pick("name", "customer", "businessname", "customername"), email: pick("email", "emailaddress"), phone: pick("phone", "mobile", "phonenumber"), address: pick("address"), gstin: pick("gstin", "gstnumber") };
}

function downloadCsv(kind: Kind, rows: Row[]) {
  const keys = kind === "vehicles" ? ["registration", "type", "capacity", "status"] : kind === "drivers" ? ["name", "email", "phone", "isActive"] : ["name", "email", "phone", "address", "gstin", "isActive"];
  const quote = (value: unknown) => `"${text(value).replaceAll('"', '""')}"`;
  const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => quote(row[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `${kind}.csv`; link.click(); URL.revokeObjectURL(url);
}

export default function ManagedDirectory({ kind, role, scopeKey }: { kind: Kind; role: string; scopeKey: string }) {
  const endpoint = routeFor[kind];
  const cacheKey = `${scopeKey}:${endpoint}`;
  const canManage = role === "TENANT_ADMIN" || role === "SUPER_ADMIN";
  const [rows, setRows] = useState<Row[]>(() => getCachedRows(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCachedRows(cacheKey));
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (force = true) => {
    if (force && !getCachedRows(cacheKey)) setLoading(true);
    try { const next = await loadRows(cacheKey, endpoint, force); setRows(next); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load records."); }
    finally { setLoading(false); }
  }, [cacheKey, endpoint]);
  useEffect(() => { void refresh(!getCachedRows(cacheKey)); }, [cacheKey, refresh]);

  const filtered = useMemo(() => rows.filter((row) => Object.values(row).some((value) => typeof value !== "object" && text(value).toLowerCase().includes(query.toLowerCase()))), [rows, query]);
  const fieldLabel = kind === "vehicles" ? "vehicles" : kind;

  function updateRow(id: string, updater: (row: Row) => Row) {
    const next = rows.map((row) => String(row.id) === id ? updater(row) : row);
    setRows(next); setCachedRows(cacheKey, next);
  }

  async function submit(body: Row, id?: string) {
    setBusy(true);
    try {
      const response = await fetch(id ? `${endpoint}/${encodeURIComponent(id)}` : endpoint, { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save record.");
      if (id) updateRow(id, (old) => ({ ...old, ...result.data })); else { const next = [result.data, ...rows]; setRows(next); setCachedRows(cacheKey, next); }
      return true;
    } catch (e) { await Swal.fire({ icon: "error", title: "Could not save", text: e instanceof Error ? e.message : "Try again." }); return false; }
    finally { setBusy(false); }
  }

  async function add() {
    const isVehicle = kind === "vehicles", isDriver = kind === "drivers";
    const { value } = await Swal.fire({ title: `Add ${isVehicle ? "vehicle" : isDriver ? "driver" : "customer"}`, html: `<div class="swal-form">${isVehicle ? `<label>Registration<input id="record-a" placeholder="MH 12 AB 4521"></label><label>Vehicle type<input id="record-b" placeholder="Tata 407"></label><label>Capacity<input id="record-c" placeholder="2.5T"></label>` : `<label>Full name<input id="record-a" placeholder="Full name"></label><label>Email<input id="record-b" type="email" placeholder="name@example.com"></label><label>Phone<input id="record-c" placeholder="+91"></label>${isDriver ? `<label>Temporary password<input id="record-d" type="password" placeholder="At least 10 characters"></label>` : `<label>Address<input id="record-d" placeholder="Business address"></label><label>GSTIN<input id="record-e" placeholder="Optional"></label><label>Login password<input id="record-f" type="password" placeholder="Optional, at least 10 characters"></label>`}`}</div>`, showCancelButton: true, confirmButtonText: "Save", preConfirm: () => {
      const a = (document.getElementById("record-a") as HTMLInputElement).value.trim(), b = (document.getElementById("record-b") as HTMLInputElement).value.trim(), c = (document.getElementById("record-c") as HTMLInputElement).value.trim();
      if (isVehicle && (!a || !b)) { Swal.showValidationMessage("Registration and vehicle type are required."); return; }
      if (!isVehicle && (!a || (!b && !c))) { Swal.showValidationMessage("Name and an email or phone number are required."); return; }
      if (isDriver && (!b || (document.getElementById("record-d") as HTMLInputElement).value.length < 10)) { Swal.showValidationMessage("Driver needs a valid email and a 10 character password."); return; }
      if (!isVehicle && b && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b)) { Swal.showValidationMessage("Enter a valid email."); return; }
      if (kind === "customers") { const password = (document.getElementById("record-f") as HTMLInputElement).value; if (password && password.length < 10) { Swal.showValidationMessage("Password needs at least 10 characters."); return; } return { name: a, email: b, phone: c, address: (document.getElementById("record-d") as HTMLInputElement).value.trim(), gstin: (document.getElementById("record-e") as HTMLInputElement).value.trim(), password, createLogin: Boolean(password) }; }
      return isVehicle ? { registration: a, type: b, capacity: c } : { name: a, email: b, phone: c, password: (document.getElementById("record-d") as HTMLInputElement).value };
    } });
    if (!value) return;
    await submit(value);
  }

  async function edit(row: Row) {
    const isVehicle = kind === "vehicles", isDriver = kind === "drivers";
    const { value } = await Swal.fire({ title: `Edit ${isVehicle ? "vehicle" : isDriver ? "driver" : "customer"}`, html: `<div class="swal-form">${isVehicle ? `<label>Registration<input id="edit-a" value="${escapeHtml(text(row.registration))}"></label><label>Vehicle type<input id="edit-b" value="${escapeHtml(text(row.type))}"></label><label>Capacity<input id="edit-c" value="${escapeHtml(text(row.capacity))}"></label><label>Status<select id="edit-d"><option value="AVAILABLE">Available</option><option value="IN_SERVICE">In service</option><option value="INACTIVE">Inactive</option></select></label>` : `<label>Full name<input id="edit-a" value="${escapeHtml(text(row.name))}"></label><label>Email<input id="edit-b" type="email" value="${escapeHtml(text(row.email))}" ${isDriver ? "disabled" : ""}></label><label>Phone<input id="edit-c" value="${escapeHtml(text(row.phone))}"></label>${!isDriver ? `<label>Address<input id="edit-d" value="${escapeHtml(text(row.address))}"></label><label>GSTIN<input id="edit-e" value="${escapeHtml(text(row.gstin))}"></label>` : ""}<label>Status<select id="edit-status"><option value="true">Active</option><option value="false">Inactive</option></select></label>`}</div>`, showCancelButton: true, confirmButtonText: "Save changes", didOpen: () => { const status = document.getElementById(isVehicle ? "edit-d" : "edit-status") as HTMLSelectElement; status.value = isVehicle ? text(row.status || "AVAILABLE") : String(active(row)); }, preConfirm: () => isVehicle ? ({ registration: (document.getElementById("edit-a") as HTMLInputElement).value.trim(), type: (document.getElementById("edit-b") as HTMLInputElement).value.trim(), capacity: (document.getElementById("edit-c") as HTMLInputElement).value.trim(), status: (document.getElementById("edit-d") as HTMLSelectElement).value }) : ({ name: (document.getElementById("edit-a") as HTMLInputElement).value.trim(), ...(isDriver ? {} : { email: (document.getElementById("edit-b") as HTMLInputElement).value.trim(), address: (document.getElementById("edit-d") as HTMLInputElement).value.trim(), gstin: (document.getElementById("edit-e") as HTMLInputElement).value.trim() }), phone: (document.getElementById("edit-c") as HTMLInputElement).value.trim(), isActive: (document.getElementById("edit-status") as HTMLSelectElement).value === "true" }) });
    if (!value || !row.id) return;
    await submit(value, String(row.id));
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return Swal.fire({ icon: "error", title: "File is too large", text: "Choose a file smaller than 10 MB." });
    const ext = file.name.toLowerCase().split(".").pop();
    if (!['csv', 'xlsx'].includes(ext ?? "")) return Swal.fire({ icon: "error", title: "Unsupported file", text: "Choose a .csv or .xlsx file." });
    setBusy(true);
    try {
      let sourceRows: Row[];
      if (ext === "csv") sourceRows = parseCsv(await file.text());
      else { const readExcel = (await import("read-excel-file/browser")).default; const workbook = await readExcel(file); const sheet = workbook[0]?.data ?? []; const headers = (sheet[0] ?? []).map((cell: unknown) => text(cell).trim().toLowerCase().replace(/[^a-z0-9]/g, "")); sourceRows = sheet.slice(1).map((cells: unknown[]) => Object.fromEntries(headers.map((header: string, index: number) => [header, cells[index] ?? ""]))); }
      const items = sourceRows.map((row) => normalizeRow(row, kind)).filter((row) => kind === "vehicles" ? row.registration && row.type : kind === "drivers" ? row.name && row.email : row.name && (row.email || row.phone));
      if (!items.length) throw new Error(`No usable rows found. Required columns: ${kind === "vehicles" ? "registration, type" : kind === "drivers" ? "name, email, phone" : "name, email, phone"}.`);
      const rowLimit = kind === "drivers" ? 200 : 500;
      if (items.length > rowLimit) throw new Error(`Import is limited to ${rowLimit} rows per file.`);
      let initialPassword = "";
      if (kind === "drivers") { const password = await Swal.fire({ title: "Temporary driver password", html: `<div class="swal-form"><label>Password for imported drivers<input id="import-driver-password" type="password" placeholder="At least 10 characters"></label></div>`, showCancelButton: true, confirmButtonText: "Import drivers", preConfirm: () => { const value = (document.getElementById("import-driver-password") as HTMLInputElement).value; if (value.length < 10) { Swal.showValidationMessage("Use at least 10 characters."); return; } return value; } }); if (!password.value) return; initialPassword = String(password.value); }
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, ...(initialPassword ? { initialPassword } : {}) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Import failed.");
      await refresh(true);
      await Swal.fire({ icon: "success", title: "Import complete", text: `${body.created ?? items.length} ${fieldLabel} imported${body.skipped ? `; ${body.skipped} duplicate rows skipped` : ""}.` });
    } catch (e) { await Swal.fire({ icon: "error", title: "Import failed", text: e instanceof Error ? e.message : "Check the file and try again." }); }
    finally { setBusy(false); }
  }

  const tableRows = kind === "vehicles" ? ["Vehicle", "Type", "Capacity", "Assigned driver", "Status"] : ["Name", "Email", "Phone", ...(kind === "customers" ? ["GSTIN", "Shipments"] : ["Completed trips"]), "Status"];
  const countActive = rows.filter(active).length;

  return <>
    <div className="team-cards">{[{ title: kind === "vehicles" ? "Total vehicles" : kind === "drivers" ? "Total drivers" : "Total customers", value: rows.length, icon: kind === "vehicles" ? Truck : Users }, { title: "Active", value: countActive, icon: Users }, { title: "Inactive", value: rows.length - countActive, icon: Users }].map((card) => <div className="team-summary-card" key={card.title}><span className="stat-icon blue"><card.icon size={18}/></span><span>{card.title}</span><strong>{card.value}</strong><small>In this workspace</small></div>)}</div>
    <section className="panel directory-panel"><div className="panel-header table-heading"><div><h2>{labels[kind]}</h2><p>Search, update, or import records for this workspace.</p></div><div className="table-actions">
      <label className="table-filter upload-label"><Upload size={14}/><span>Import CSV / Excel</span><input type="file" accept=".csv,.xlsx" disabled={!canManage || busy} onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>
      <button className="table-filter" onClick={() => downloadCsv(kind, filtered)}><Download size={14}/>Export CSV</button>
      {canManage && <button className="button button-primary small-button" disabled={busy} onClick={() => void add()}><Plus size={15}/>Add {kind === "vehicles" ? "vehicle" : kind === "drivers" ? "driver" : "customer"}</button>}
    </div></div><div className="directory-toolbar"><label className="directory-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${fieldLabel}…`}/></label><button className="table-filter" disabled={busy} onClick={() => void refresh(true)}><RefreshCw size={14}/>{busy ? "Saving…" : "Refresh"}</button></div>
      {error && <div className="empty-state">{error}</div>}{loading ? <div className="table-skeleton"><i/><i/><i/></div> : <div className="table-scroll"><table className="data-table"><thead><tr>{tableRows.map((header) => <th key={header}>{header.toUpperCase()}</th>)}{canManage && <th>ACTIONS</th>}</tr></thead><tbody>{filtered.map((row) => <tr key={text(row.id)}>{kind === "vehicles" ? <><td><strong className="shipment-id">{text(row.registration)}</strong></td><td>{text(row.type)}</td><td>{text(row.capacity) || "—"}</td><td>{text(((row.trips as Row[] | undefined)?.[0]?.driver as Row | undefined)?.name) || "Unassigned"}</td><td><span className={`pill-status ${text(row.status).toLowerCase()}`}><i/>{text(row.status).replaceAll("_", " ")}</span></td></> : <><td><strong className="shipment-id">{text(row.name)}</strong></td><td>{text(row.email) || "—"}</td><td>{text(row.phone) || "—"}</td>{kind === "customers" ? <><td>{text(row.gstin) || "—"}</td><td>{text((row._count as Row | undefined)?.trips ?? 0)}</td></> : <td>{text((row._count as Row | undefined)?.assignedTrips ?? 0)}</td>}<td><span className={`pill-status ${active(row) ? "active" : "pending"}`}><i/>{active(row) ? "Active" : "Inactive"}</span></td></>}{canManage && <td><button className="row-more" aria-label={`Edit ${kind === "vehicles" ? text(row.registration) : text(row.name)}`} title="Edit and update" onClick={() => void edit(row)}><Pencil size={16}/></button></td>}</tr>)}</tbody></table>{!filtered.length && <div className="empty-state"><FileSpreadsheet size={25}/><strong>{query ? "No matching records" : `No ${fieldLabel} yet`}</strong><span>{query ? "Try another search." : "Add a record or import a CSV/Excel file."}</span></div>}</div>}
      <div className="pagination"><span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> records</span></div>
    </section>
  </>;
}
