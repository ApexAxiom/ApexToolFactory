"use client";
import { useState } from "react";
import Card from "@/components/Card";
import SaveBar from "@/components/SaveBar";
import { TotalsPanel } from "@/components/TotalsPanel";

/**
 * Client component for composing a minimal quote draft.
 * @returns Interactive form to capture quote basics.
 * @example
 * ```tsx
 * export default function Page() {
 *   return <NewQuote />;
 * }
 * ```
 */
export default function NewQuote() {
  const [customerName,setCustomerName]=useState("");
  const [unitPrice,setUnitPrice]=useState(99);
  const [qty,setQty]=useState(1);
  const subtotal = unitPrice*qty, tax = Math.round(subtotal*0.0825*100)/100, total = subtotal+tax;

  const save = async () => {
    const r = await fetch("/api/quotes", { method: "POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({ customerId:"placeholder", propertyId:"placeholder", customerName, items: [{ unitPrice, qty }] })
    });
    const q = await r.json();
    if (r.ok) location.href = `/quotes/${q.id}`;
    else alert("Error saving quote");
  };

  return (
    <main className="max-w-3xl mx-auto p-6 grid gap-4">
      <Card>
        <label className="block mb-1">Customer name</label>
        <input className="input" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
      </Card>
      <Card className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Unit price</label>
          <input className="input" type="number" value={unitPrice} onChange={e=>setUnitPrice(+e.target.value)} />
        </div>
        <div>
          <label className="block mb-1">Quantity</label>
          <input className="input" type="number" value={qty} min={1} onChange={e=>setQty(+e.target.value)} />
        </div>
      </Card>
      <TotalsPanel subtotal={subtotal} tax={tax} total={total} />
      <SaveBar>
        <button className="btn" onClick={()=>history.back()}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save Quote</button>
      </SaveBar>
    </main>
  );
}
