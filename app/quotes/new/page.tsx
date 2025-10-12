'use client';

import { useMemo, useState } from 'react';
import { WizardSteps } from '@/components/pricing/WizardSteps';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DebugPanel } from '@/components/pricing/DebugPanel';
import { LineItemTable } from '@/components/pricing/LineItemTable';
import { runPricingEngine } from '@/lib/pricing/engine';

const wizardSteps = [
  { id: 1, label: 'Customer', description: 'Select customer and property' },
  { id: 2, label: 'Service', description: 'Choose template and scope' },
  { id: 3, label: 'Area & Add-ons', description: 'Size and adjustments' },
  { id: 4, label: 'Pricing', description: 'Margins, rounding, tax' },
  { id: 5, label: 'Delivery', description: 'PDF and email' },
];

const mockInput = {
  propertyType: 'Residential' as const,
  area: 1800,
  infestationMultiplier: 1,
  complexityMultiplier: 1,
  interior: true,
  exterior: true,
  chemicals: [
    {
      id: 'chem1',
      name: 'Bifenthrin 7.9%',
      usageRatePer1000: 3.2,
      packageSize: 1,
      packageCost: 85,
      wastePercent: 0.05,
      useFor: 'both' as const,
    },
  ],
  setupTime: 0.5,
  timePer1000: 0.35,
  hourlyWage: 22,
  burdenPercent: 0.28,
  travelFixedMinutes: 15,
  travelMinutesPerMile: 1.5,
  travelMiles: 10,
  manualLaborAdderHours: 0,
  mode: 'margin' as const,
  marginOrMarkup: 0.45,
  fees: 0,
  discounts: 0,
  taxRate: 0.0825,
  roundingRule: 'nearest_5' as const,
  minimum: 95,
  tierRules: [
    { propertyType: 'Residential', fromArea: 0, toArea: 1500, priceFloor: null, pricePer1000Override: null },
    { propertyType: 'Residential', fromArea: 1501, toArea: 2500, priceFloor: 125, pricePer1000Override: null },
  ],
  template: {
    residentialMultiplier: 1,
    commercialMultiplier: 1.15,
    defaultInfestationMultiplier: 1,
    defaultComplexityMultiplier: 1,
    minPrice: 95,
    mainUnit: 'ft2' as const,
  },
  currency: 'USD',
  unitsArea: 'ft2' as const,
  travelOverrideAmount: undefined,
  travelOverrideMinutes: undefined,
};

export default function QuoteWizardPage() {
  const [current, setCurrent] = useState(1);
  const [area, setArea] = useState(mockInput.area);
  const [pricingMode, setPricingMode] = useState<'margin' | 'markup'>(mockInput.mode);

  const result = useMemo(() => {
    return runPricingEngine({
      ...mockInput,
      area,
      mode: pricingMode,
    });
  }, [area, pricingMode]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <WizardSteps steps={wizardSteps} current={current} />
        <Card title={<span className="text-lg font-semibold">Step {current}: Configure quote</span>}>
          <div className="space-y-4">
            <FormField label="Area (ft²)">
              <Input type="number" value={area} min={0} onChange={(event) => setArea(Number(event.target.value))} />
            </FormField>
            <FormField label="Pricing mode">
              <Select value={pricingMode} onChange={(event) => setPricingMode(event.target.value as 'margin' | 'markup')}>
                <option value="margin">Margin ({(mockInput.marginOrMarkup * 100).toFixed(0)}%)</option>
                <option value="markup">Markup ({(mockInput.marginOrMarkup * 100).toFixed(0)}%)</option>
              </Select>
            </FormField>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => setCurrent((value) => Math.min(wizardSteps.length, value + 1))}>
                Next step
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCurrent((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
            </div>
          </div>
        </Card>
        <Card title={<span className="text-lg font-semibold">Line items</span>}>
          <LineItemTable items={result.lineItems} />
          <div className="mt-4 flex justify-between text-sm text-slate-700">
            <span>Subtotal</span>
            <span>${result.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-700">
            <span>Tax</span>
            <span>${result.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-slate-900">
            <span>Total</span>
            <span>${result.total.toFixed(2)}</span>
          </div>
        </Card>
      </div>
      <DebugPanel payload={result.snapshot} />
    </div>
  );
}
