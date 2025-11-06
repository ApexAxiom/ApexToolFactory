"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/Card";
import SaveBar from "@/components/SaveBar";
import { TotalsPanel } from "@/components/TotalsPanel";
import type { IndexRow, Quote } from "@/lib/types";

export default function NewInvoice() {
  const params = useSearchParams();
  const [quotes, setQuotes] = useState<IndexRow[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [unitPrice, setUnitPrice] = useState(99);
  const [qty, setQty] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    fetch("/api/quotes").then(async (res) => {
      if (!res.ok) return [];
      return res.json();
    }).then((rows: IndexRow[]) => setQuotes(rows)).catch(() => setQuotes([]));
  }, []);

  useEffect(() => {
    const initial = params?.get("quoteId");
    if (initial) {
      setQuoteId(initial);
    }
  }, [params]);

  useEffect(() => {
    if (!quoteId) return;
    setLoadingQuote(true);
    fetch(`/api/quotes/${quoteId}`).then(async (res) => {
      if (!res.ok) return null;
      return res.json() as Promise<Quote>;
    }).then((data) => {
      if (!data) return;
      setCustomerName(data.customerName ?? "");
      const firstItem = data.items[0];
      if (firstItem) {
        setUnitPrice(firstItem.unitPrice);
        setQty(firstItem.qty);
      }
      setCustomerId(data.customerId ?? "");
      setPropertyId(data.propertyId ?? "");
    }).finally(() => setLoadingQuote(false));
  }, [quoteId]);

  const subtotal = unitPrice * qty;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const total = subtotal + tax;

  const save = async () => {
    const payload = {
      quoteId: quoteId ?? undefined,
      customerId: customerId || undefined,
      propertyId: propertyId || undefined,
      customerName,
      items: [{ unitPrice, qty }]
    };
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      alert("Error saving invoice");
      return;
    }
    const invoice = await r.json();
    location.href = `/invoices/${invoice.id}`;
  };

  return (
    <main className="max-w-3xl mx-auto p-6 grid gap-4">
      <Card>
        <label className="block mb-1">Load from quote</label>
        <select
          className="input"
          value={quoteId ?? ""}
          onChange={(e) => setQuoteId(e.target.value ? e.target.value : null)}
        >
          <option value="">Select a quote…</option>
          {quotes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.number} — {q.customerName}
            </option>
          ))}
        </select>
        {loadingQuote && <div className="text-sm text-slate-500 mt-2">Loading quote…</div>}
      </Card>
      <Card>
        <label className="block mb-1">Customer name</label>
        <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      </Card>
      <Card className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Unit price</label>
          <input
            className="input"
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(+e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">Quantity</label>
          <input
            className="input"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, +e.target.value))}
          />
        </div>
      </Card>
      <TotalsPanel subtotal={subtotal} tax={tax} total={total} />
      <SaveBar>
        <button className="btn" onClick={() => history.back()}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save Invoice</button>
      </SaveBar>
    </main>
  );
}
