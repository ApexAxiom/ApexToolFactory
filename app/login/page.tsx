"use client";
import { useState } from "react";
import Card from "@/components/Card";

/**
 * Client component providing simple passphrase-based login.
 * @returns Login form prompting for organization and passphrase.
 * @example
 * ```tsx
 * export default function Page() {
 *   return <LoginPage />;
 * }
 * ```
 */
export default function LoginPage(){
  const [pass, setPass] = useState("");
  const [org, setOrg] = useState("default");
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    const r = await fetch("/api/login", { method:"POST", body: JSON.stringify({ passphrase: pass, orgId: org }) });
    if (r.ok) location.href = "/";
    else setErr("Invalid passphrase");
  };
  return (
    <div className="grid place-items-center h-dvh p-4">
      <Card className="max-w-sm w-full">
        <h1 className="text-xl font-semibold mb-4">Pest Estimator</h1>
        <input className="input mb-3" placeholder="Organization (optional)" value={org} onChange={e=>setOrg(e.target.value)} />
        <input className="input mb-4" type="password" placeholder="Admin passphrase" value={pass} onChange={e=>setPass(e.target.value)} />
        {err && <div className="text-red-600 mb-3">{err}</div>}
        <button className="btn btn-primary w-full" onClick={submit}>Sign in</button>
      </Card>
    </div>
  );
}
