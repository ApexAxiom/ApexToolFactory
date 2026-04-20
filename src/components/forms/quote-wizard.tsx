"use client";

import { useMemo, useState } from "react";
import { calculatePricing } from "@/domain/pricing";
import { Customer, Property } from "@/domain/types";
import { currency } from "@/lib/utils";

const pestCatalog = [
  { code: "general", label: "General pest coverage", amount: 75 },
  { code: "termite", label: "Termite treatment", amount: 250 },
  { code: "rodent", label: "Rodent exclusion", amount: 180 },
  { code: "mosquito", label: "Mosquito service", amount: 95 }
];

const visitOptions = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" }
] as const;

const pricingControls = [
  { label: "Base rate per sqft", valueKey: "baseRatePerSqft" },
  { label: "Labor hours", valueKey: "laborHours" },
  { label: "Labor rate", valueKey: "laborRate" },
  { label: "Materials", valueKey: "materials" },
  { label: "Travel", valueKey: "travel" },
  { label: "Markup %", valueKey: "markupPercent" },
  { label: "Tax %", valueKey: "taxPercent" }
] as const;

export function QuoteWizard({
  customers,
  propertiesByCustomer,
  action
}: {
  customers: Customer[];
  propertiesByCustomer: Record<string, Property[]>;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [visitType, setVisitType] = useState<"ONE_TIME" | "MONTHLY" | "QUARTERLY">("ONE_TIME");
  const [serviceScope, setServiceScope] = useState("Exterior perimeter treatment, inspection, and treatment notes.");
  const [notes, setNotes] = useState("");
  const [selectedPests, setSelectedPests] = useState<string[]>(["general"]);
  const [baseRatePerSqft, setBaseRatePerSqft] = useState(0.06);
  const [laborHours, setLaborHours] = useState(1.5);
  const [laborRate, setLaborRate] = useState(85);
  const [materials, setMaterials] = useState(25);
  const [travel, setTravel] = useState(15);
  const [markupPercent, setMarkupPercent] = useState(15);
  const [taxPercent, setTaxPercent] = useState(0);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const customerProperties = propertiesByCustomer[selectedCustomerId] || [];
  const selectedProperty = customerProperties.find((property) => property.id === selectedPropertyId);

  const payload = useMemo(
    () => ({
      customerName: selectedCustomer?.name || "",
      propertyAddress:
        selectedProperty?.address1 ||
        selectedCustomer?.billingAddress1 ||
        "Property address required",
      propertySquareFootage: selectedProperty?.sqft || 0,
      visitType,
      pestFindings: pestCatalog.filter((item) => selectedPests.includes(item.code)),
      serviceScope,
      notes,
      pricing: {
        baseRatePerSqft,
        laborHours,
        laborRate,
        materials,
        travel,
        markupPercent,
        taxPercent
      }
    }),
    [
      baseRatePerSqft,
      laborHours,
      laborRate,
      materials,
      markupPercent,
      notes,
      selectedCustomer,
      selectedPests,
      selectedProperty,
      serviceScope,
      taxPercent,
      travel,
      visitType
    ]
  );

  const pricing = calculatePricing(payload);
  const pricingValues = {
    baseRatePerSqft,
    laborHours,
    laborRate,
    materials,
    travel,
    markupPercent,
    taxPercent
  };
  const pricingSetters = {
    baseRatePerSqft: setBaseRatePerSqft,
    laborHours: setLaborHours,
    laborRate: setLaborRate,
    materials: setMaterials,
    travel: setTravel,
    markupPercent: setMarkupPercent,
    taxPercent: setTaxPercent
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-panel">
        <div className="mb-6 flex flex-wrap gap-2">
          {["Customer", "Scope", "Pricing", "Review"].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-full px-4 py-2 text-sm ${step === index ? "bg-pine text-white" : "bg-canvas text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form action={action} className="space-y-6">
          <input type="hidden" name="customerId" value={selectedCustomerId} />
          <input type="hidden" name="propertyId" value={selectedPropertyId} />
          <input type="hidden" name="title" value={`${selectedCustomer?.name || "Customer"} service quote`} />
          <input type="hidden" name="propertyAddress" value={payload.propertyAddress} />
          <input type="hidden" name="propertySquareFootage" value={String(payload.propertySquareFootage || 0)} />
          <input type="hidden" name="visitType" value={visitType} />
          <input type="hidden" name="serviceScope" value={serviceScope} />
          <input type="hidden" name="notes" value={notes} />
          <input type="hidden" name="pestFindings" value={JSON.stringify(payload.pestFindings)} />
          <input type="hidden" name="baseRatePerSqft" value={String(baseRatePerSqft)} />
          <input type="hidden" name="laborHours" value={String(laborHours)} />
          <input type="hidden" name="laborRate" value={String(laborRate)} />
          <input type="hidden" name="materials" value={String(materials)} />
          <input type="hidden" name="travel" value={String(travel)} />
          <input type="hidden" name="markupPercent" value={String(markupPercent)} />
          <input type="hidden" name="taxPercent" value={String(taxPercent)} />

          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-ink/80">
                Customer
                <select
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                  value={selectedCustomerId}
                  onChange={(event) => {
                    setSelectedCustomerId(event.target.value);
                    setSelectedPropertyId("");
                  }}
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-ink/80">
                Property
                <select
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                  value={selectedPropertyId}
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                >
                  <option value="">Use billing address</option>
                  {customerProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <label className="space-y-2 text-sm font-medium text-ink/80">
                Visit cadence
                <select
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                  value={visitType}
                  onChange={(event) => setVisitType(event.target.value as typeof visitType)}
                >
                  {visitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-ink/80">
                Service scope
                <textarea
                  className="min-h-32 w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                  value={serviceScope}
                  onChange={(event) => setServiceScope(event.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {pestCatalog.map((item) => {
                  const checked = selectedPests.includes(item.code);
                  return (
                    <label key={item.code} className="flex items-center justify-between rounded-2xl border border-ink/10 px-4 py-3">
                      <span>
                        <span className="block font-medium">{item.label}</span>
                        <span className="text-sm text-ink/60">{currency(item.amount)}</span>
                      </span>
                      <input
                        checked={checked}
                        onChange={() =>
                          setSelectedPests((current) =>
                            checked ? current.filter((value) => value !== item.code) : [...current, item.code]
                          )
                        }
                        type="checkbox"
                      />
                    </label>
                  );
                })}
              </div>
              <label className="space-y-2 text-sm font-medium text-ink/80">
                Internal notes
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pricingControls.map((control) => (
                <label key={control.valueKey} className="space-y-2 text-sm font-medium text-ink/80">
                  {control.label}
                  <input
                    className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                    type="number"
                    step="0.01"
                    value={pricingValues[control.valueKey]}
                    onChange={(event) => pricingSetters[control.valueKey](Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3 text-sm text-ink/80">
              <p className="text-base font-semibold text-ink">Review before saving</p>
              <p>{payload.customerName}</p>
              <p>{payload.propertyAddress}</p>
              <p>{serviceScope}</p>
              <p>Findings: {payload.pestFindings.map((item) => item.label).join(", ") || "None"}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm text-ink/80 disabled:opacity-40"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(3, current + 1))}
                className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button type="submit" className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white">
                Save quote draft
              </button>
            )}
          </div>
        </form>
      </div>

      <aside className="rounded-2xl border border-ink/10 bg-pine p-6 text-white shadow-panel">
        <div className="mb-4 font-mono text-xs uppercase tracking-[0.24em] text-white/60">Live total</div>
        <div className="mb-2 text-4xl font-semibold">{currency(pricing.grandTotal)}</div>
        <div className="space-y-2 text-sm text-white/80">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{currency(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{currency(pricing.taxTotal)}</span>
          </div>
        </div>
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="mb-3 font-medium">Line items</div>
          <div className="space-y-3 text-sm">
            {pricing.lineItems.map((line) => (
              <div key={`${line.category}-${line.description}`} className="flex justify-between gap-3">
                <span>{line.description}</span>
                <span>{currency(line.lineTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
