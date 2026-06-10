"use client";

import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Save,
  SlidersHorizontal,
  UserRound
} from "lucide-react";
import { calculatePricing } from "@/domain/pricing";
import { Customer, Property } from "@/domain/types";
import { currency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";

const pestCatalog = [
  { code: "general", label: "General Pest Control", description: "Interior and exterior treatment for pests.", amount: 75 },
  { code: "rodent", label: "Rodent Monitoring", description: "Monitoring stations and reporting.", amount: 180 },
  { code: "mosquito", label: "Mosquito Treatment", description: "Seasonal mosquito reduction.", amount: 95 },
  { code: "termite", label: "Termite Treatment", description: "Targeted termite treatment and prevention.", amount: 250 }
];

const visitOptions = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" }
] as const;

type VisitType = (typeof visitOptions)[number]["value"];
const visitMultipliers: Record<VisitType, number> = {
  ONE_TIME: 1,
  MONTHLY: 0.75,
  QUARTERLY: 0.85
};

const fieldClass =
  "h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export function QuoteWizard({
  customers,
  propertiesByCustomer,
  action
}: {
  customers: Customer[];
  propertiesByCustomer: Record<string, Property[]>;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("QUARTERLY");
  const [firstServiceDate, setFirstServiceDate] = useState("");
  const [serviceScope, setServiceScope] = useState(
    "Quarterly general pest control with exterior perimeter treatment, interior inspection, rodent monitoring, and seasonal mosquito coverage."
  );
  const [notes, setNotes] = useState("Customer prefers service before opening hours. Confirm access with building security.");
  const [selectedPests, setSelectedPests] = useState<string[]>(["general", "rodent", "mosquito"]);
  const [baseRatePerSqft, setBaseRatePerSqft] = useState(0.04);
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(85);
  const [materials, setMaterials] = useState(0);
  const [travel, setTravel] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(8.25);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const customerProperties = propertiesByCustomer[selectedCustomerId] || [];
  const selectedProperty = customerProperties.find((property) => property.id === selectedPropertyId);
  const propertyLabel = selectedProperty
    ? `${selectedProperty.sqft?.toLocaleString() || "Unknown"} sq ft - ${selectedProperty.structureType || "Commercial"}`
    : selectedCustomer?.billingAddress1 || "Use billing address";

  const payload = useMemo(
    () => ({
      customerName: selectedCustomer?.name || "",
      propertyAddress: selectedProperty?.address1 || selectedCustomer?.billingAddress1 || "Property address required",
      propertySquareFootage: selectedProperty?.sqft || 12600,
      visitType,
      pestFindings: pestCatalog.filter((item) => selectedPests.includes(item.code)),
      lineItems: pestCatalog
        .filter((item) => selectedPests.includes(item.code))
        .map((item, index) => {
          const sqft = selectedProperty?.sqft || 12600;
          const lineTotal =
            item.code === "general"
              ? sqft * baseRatePerSqft * visitMultipliers[visitType]
              : item.amount;
          return {
            description: item.label,
            category: "SERVICE",
            interval: visitType,
            qty: item.code === "general" ? sqft : index === 1 ? 10 : 1,
            unitPrice: item.code === "general" ? baseRatePerSqft : item.amount,
            lineTotal,
            taxable: true
          };
        }),
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
  const selectedServiceRows = pestCatalog.filter((item) => selectedPests.includes(item.code));

  function togglePest(code: string) {
    setSelectedPests((current) =>
      current.includes(code) ? current.filter((value) => value !== code) : [...current, code]
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="customerId" value={selectedCustomerId} />
      <input type="hidden" name="propertyId" value={selectedPropertyId} />
      <input type="hidden" name="title" value={`${selectedCustomer?.name || "Customer"} service quote`} />
      <input type="hidden" name="propertyAddress" value={payload.propertyAddress} />
      <input type="hidden" name="propertySquareFootage" value={String(payload.propertySquareFootage || 0)} />
      <input type="hidden" name="visitType" value={visitType} />
      <input type="hidden" name="firstServiceDate" value={firstServiceDate} />
      <input type="hidden" name="serviceScope" value={serviceScope} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="pestFindings" value={JSON.stringify(payload.pestFindings)} />
      <input type="hidden" name="lineItems" value={JSON.stringify(payload.lineItems || [])} />
      <input type="hidden" name="baseRatePerSqft" value={String(baseRatePerSqft)} />
      <input type="hidden" name="laborHours" value={String(laborHours)} />
      <input type="hidden" name="laborRate" value={String(laborRate)} />
      <input type="hidden" name="materials" value={String(materials)} />
      <input type="hidden" name="travel" value={String(travel)} />
      <input type="hidden" name="markupPercent" value={String(markupPercent)} />
      <input type="hidden" name="taxPercent" value={String(taxPercent)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/quotes" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald">
          <ArrowLeft className="h-4 w-4" />
          Back to quotes
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">New quote</span>
          <Badge>Draft</Badge>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SummaryStrip
            client={selectedCustomer?.name || "Select client"}
            property={propertyLabel}
            value={pricing.grandTotal}
          />

          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
            <SetupRow
              icon={UserRound}
              title="Client details"
              description="Select client and contact"
              control={
                <select
                  className={`${fieldClass} w-full min-w-0 sm:w-72`}
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
              }
            />
            <SetupRow
              icon={Building2}
              title="Property details"
              description="Service location and property info"
              control={
                <select
                  className={`${fieldClass} w-full min-w-0 sm:w-72`}
                  value={selectedPropertyId}
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                >
                  <option value="">Use billing address</option>
                  {customerProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} {property.sqft ? `- ${property.sqft.toLocaleString()} sq ft` : ""}
                    </option>
                  ))}
                </select>
              }
            />
            <SetupRow
              icon={ClipboardList}
              title="Service plan"
              description="Choose a service plan and cadence"
              control={
                <select
                  className={`${fieldClass} w-full min-w-0 sm:w-72`}
                  value={visitType}
                  onChange={(event) => setVisitType(event.target.value as VisitType)}
                >
                  {visitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} General Pest Control
                    </option>
                  ))}
                </select>
              }
            />

            <section className="border-t border-line p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 text-emerald" />
                  <div>
                    <h2 className="font-semibold">Line items and coverage</h2>
                    <p className="text-sm text-muted">Review services and coverage options</p>
                  </div>
                </div>
                <Badge>{selectedServiceRows.length} items</Badge>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
                    <tr>
                      <th className="px-3 py-3">Item</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3">Interval</th>
                      <th className="px-3 py-3">Qty / Size</th>
                      <th className="px-3 py-3">Unit price</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedServiceRows.map((item, index) => {
                      const amount =
                        item.code === "general"
                          ? pricing.lineItems.find((line) => line.description === item.label)?.lineTotal || item.amount
                          : item.amount;
                      const intervalLabel = visitOptions.find((option) => option.value === visitType)?.label;
                      return (
                        <tr key={item.code} className="bg-white">
                          <td className="px-3 py-3 font-semibold">{item.label}</td>
                          <td className="px-3 py-3 text-muted">{item.description}</td>
                          <td className="px-3 py-3 text-muted">{intervalLabel}</td>
                          <td className="px-3 py-3 text-muted">
                            {index === 0 ? `${payload.propertySquareFootage.toLocaleString()} sq ft` : index === 1 ? "10 stations" : "1"}
                          </td>
                          <td className="px-3 py-3">{item.code === "general" ? currency(baseRatePerSqft) : currency(item.amount)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{currency(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {pestCatalog.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => togglePest(item.code)}
                    className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                      selectedPests.includes(item.code)
                        ? "border-emerald bg-mist text-emerald"
                        : "border-line bg-white text-muted hover:text-ink"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    {selectedPests.includes(item.code) ? "Remove" : "Add"} {item.label}
                  </button>
                ))}
              </div>
            </section>

            <CompactSection
              icon={SlidersHorizontal}
              title="Pricing and adjustments"
              description="Taxes, discounts and pricing rules"
              control={
                <div className="flex flex-wrap gap-2">
                  <input
                    className={`${fieldClass} w-28`}
                    type="number"
                    step="0.01"
                    value={baseRatePerSqft}
                    onChange={(event) => setBaseRatePerSqft(Number(event.target.value))}
                    aria-label="Base rate per square foot"
                  />
                  <input
                    className={`${fieldClass} w-28`}
                    type="number"
                    step="0.01"
                    value={taxPercent}
                    onChange={(event) => setTaxPercent(Number(event.target.value))}
                    aria-label="Tax percent"
                  />
                </div>
              }
            />
            <CompactSection
              icon={CalendarDays}
              title="Scheduling"
              description="When accepted, the first visit is booked on this date"
              control={
                <input
                  type="date"
                  className={`${fieldClass} w-44`}
                  value={firstServiceDate}
                  onChange={(event) => setFirstServiceDate(event.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  aria-label="First service date"
                />
              }
            />
            <div className="border-t border-line p-4 sm:p-5">
              <label className="block text-sm font-semibold text-ink">
                Proposal scope
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-line bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                  value={serviceScope}
                  onChange={(event) => setServiceScope(event.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm font-semibold text-ink">
                Internal notes
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-line bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <ProposalPreview
          subtotal={pricing.subtotal}
          taxTotal={pricing.taxTotal}
          total={pricing.grandTotal}
          visitType={visitType}
          firstServiceDate={firstServiceDate}
          customerName={selectedCustomer?.name || "Client"}
          serviceRows={selectedServiceRows.map((item) => ({
            code: item.code,
            label: item.label,
            amount:
              item.code === "general"
                ? pricing.lineItems.find((line) => line.description === item.label)?.lineTotal || item.amount
                : item.amount
          }))}
        />
      </div>
    </form>
  );
}

function SummaryStrip({ client, property, value }: { client: string; property: string; value: number }) {
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-subtle md:grid-cols-3">
      {[
        ["Client", client],
        ["Property", property],
        ["Opportunity value", currency(value)]
      ].map(([label, content], index) => (
        <div key={label} className={index === 0 ? "" : "md:border-l md:border-line md:pl-5"}>
          <div className="text-xs font-semibold text-muted">{label}</div>
          <div className="mt-1 truncate text-sm font-semibold text-ink">{content}</div>
        </div>
      ))}
    </div>
  );
}

function SetupRow({
  icon: Icon,
  title,
  description,
  control
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-line p-4 first:border-t-0 sm:grid-cols-[1fr_auto_24px] sm:items-center sm:p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 text-emerald" />
        <div>
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      {control}
      <CheckCircle2 className="hidden h-5 w-5 text-emerald sm:block" />
    </section>
  );
}

function CompactSection({
  icon: Icon,
  title,
  description,
  control
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-emerald" />
        <div>
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">{control}</div>
    </section>
  );
}

function ProposalPreview({
  subtotal,
  taxTotal,
  total,
  visitType,
  firstServiceDate,
  customerName,
  serviceRows
}: {
  subtotal: number;
  taxTotal: number;
  total: number;
  visitType: VisitType;
  firstServiceDate: string;
  customerName: string;
  serviceRows: Array<{ code: string; label: string; amount: number }>;
}) {
  const cadenceLabel = visitOptions.find((option) => option.value === visitType)?.label || "One-time";
  return (
    <aside className="h-fit rounded-lg border border-line bg-white p-5 shadow-subtle xl:sticky xl:top-28">
      <h2 className="mb-5 text-lg font-semibold">Proposal preview</h2>
      <div className="space-y-4 text-sm">
        <div>
          <div className="mb-2 flex justify-between font-semibold">
            <span>{visitType === "ONE_TIME" ? "One-time services" : "Recurring services"}</span>
            <span>{currency(subtotal)}</span>
          </div>
          {visitType !== "ONE_TIME" ? <div className="text-muted">{cadenceLabel}</div> : null}
          {serviceRows.map((item) => (
            <div key={item.code} className="mt-2 flex justify-between text-muted">
              <span>{item.label}</span>
              <span>{currency(item.amount)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-line pt-4">
          <div className="mb-2 flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>{currency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Tax</span>
            <span>{currency(taxTotal)}</span>
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-line pt-4">
          <span className="text-lg font-semibold">{visitType === "ONE_TIME" ? "Total" : `Total per visit`}</span>
          <span className="text-3xl font-semibold text-emerald">{currency(total)}</span>
        </div>
        {visitType !== "ONE_TIME" || firstServiceDate ? (
          <div className="rounded-lg bg-mist p-4 text-xs text-muted">
            <div className="flex justify-between">
              {visitType !== "ONE_TIME" ? <span>Billed {cadenceLabel.toLowerCase()}</span> : <span>Single visit</span>}
              {firstServiceDate ? <span>First service: {firstServiceDate}</span> : <span>First service date not set</span>}
            </div>
          </div>
        ) : null}
        <SubmitButton className="w-full" pendingText="Saving draft...">
          <Save className="h-4 w-4" />
          Save quote draft
        </SubmitButton>
        <p className="text-center text-xs leading-5 text-muted">
          Saving creates a draft — you review it and send the proposal email from the quote page.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1 text-sm text-muted">
          <CheckCircle2 className="h-4 w-4" />
          Proposal valid for 30 days
        </div>
        <p className="sr-only">Proposal prepared for {customerName}</p>
      </div>
    </aside>
  );
}
