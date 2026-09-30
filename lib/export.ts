export function toCSV(fields: string[], rows: Record<string, any>[]) {
  const esc = (v: any) => {
    if (v === undefined || v === null) return "";
    let s = Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return "\uFEFF" + [fields.join(","), ...rows.map((r) => fields.map((f) => esc(r[f])).join(","))].join("\r\n");
}
