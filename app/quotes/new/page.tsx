'use client';

import { useEffect, useMemo, useState } from 'react';
import { WizardSteps } from '@/components/pricing/WizardSteps';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DebugPanel } from '@/components/pricing/DebugPanel';
import { LineItemTable } from '@/components/pricing/LineItemTable';
import { runPricingEngine } from '@/lib/pricing/engine';
import { Modal } from '@/components/ui/Modal';

const wizardSteps = [
  { id: 1, label: 'Customer', description: 'Select customer and property' },
  { id: 2, label: 'Service', description: 'Choose template and scope' },
  { id: 3, label: 'Area & Add-ons', description: 'Size and adjustments' },
  { id: 4, label: 'Pricing', description: 'Margins, rounding, tax' },
  { id: 5, label: 'Delivery', description: 'PDF and email' },
];

type BootstrapData = {
  settings: any;
  customers: Array<{ id: string; name: string; properties: Array<{ id: string; address: string; propertyType: 'Residential'|'Commercial'; area: number }> }>;
  templates: Array<{ id: string; name: string; mainUnit: 'ft2'|'m2'|'linear_ft'|'each'; setupTimeHrs: number; timePer1000Hrs: number; minPrice: number; defaultInfestationMultiplier: number; defaultComplexityMultiplier: number; residentialMultiplier: number; commercialMultiplier: number; tierRules: any[]; recipeItems: Array<{ useFor: 'interior'|'exterior'|'both'; usageRatePer1000: number; chemical: { id: string; name: string; packageSize: number; packageCost: number; wastePercent: number } }> }>;
  presets: Array<{ id: string; name: string; pricingMode: 'margin'|'markup'; marginOrMarkup: number; hourlyWage: number; burdenPercent: number; taxRate: number; roundingRule: 'nearest_1'|'nearest_5'|'psychological_9'; minimum: number; travelFixedMin: number; travelMinsPerMile: number; fees: number; discounts: number }>;
};

const emptyBootstrap: BootstrapData = { settings: null, customers: [], templates: [], presets: [] };

export default function QuoteWizardPage() {
  const [current, setCurrent] = useState(1);
  const [bootstrap, setBootstrap] = useState<BootstrapData>(emptyBootstrap);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [area, setArea] = useState<number>(0);
  const [interior, setInterior] = useState(true);
  const [exterior, setExterior] = useState(true);
  const [mode, setMode] = useState<'margin'|'markup'>('margin');
  const [marginOrMarkup, setMarginOrMarkup] = useState<number>(0.45);
  const [hourlyWage, setHourlyWage] = useState<number>(22);
  const [burdenPercent, setBurdenPercent] = useState<number>(0.28);
  const [taxRate, setTaxRate] = useState<number>(0.0825);
  const [roundingRule, setRoundingRule] = useState<'nearest_1'|'nearest_5'|'psychological_9'>('nearest_5');
  const [minimum, setMinimum] = useState<number>(95);
  const [fees, setFees] = useState<number>(0);
  const [discounts, setDiscounts] = useState<number>(0);
  const [travelFixedMinutes, setTravelFixedMinutes] = useState<number>(15);
  const [travelMinutesPerMile, setTravelMinutesPerMile] = useState<number>(1.5);
  const [travelMiles, setTravelMiles] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/quotes/bootstrap');
      if (!res.ok) return;
      const data = (await res.json()) as BootstrapData;
      setBootstrap(data);
      if (data.customers[0]) {
        setSelectedCustomerId(data.customers[0].id);
        if (data.customers[0].properties[0]) {
          const p = data.customers[0].properties[0];
          setSelectedPropertyId(p.id);
          setArea(p.area);
        }
      }
      if (data.templates[0]) setSelectedTemplateId(data.templates[0].id);
      if (data.presets[0]) {
        setSelectedPresetId(data.presets[0].id);
        applyPreset(data.presets[0]);
      }
    })();
  }, []);

  const applyPreset = (preset: BootstrapData['presets'][number]) => {
    setMode(preset.pricingMode);
    setMarginOrMarkup(preset.marginOrMarkup);
    setHourlyWage(preset.hourlyWage);
    setBurdenPercent(preset.burdenPercent);
    setTaxRate(preset.taxRate);
    setRoundingRule(preset.roundingRule);
    setMinimum(preset.minimum);
    setFees(preset.fees);
    setDiscounts(preset.discounts);
    setTravelFixedMinutes(preset.travelFixedMin);
    setTravelMinutesPerMile(preset.travelMinsPerMile);
  };

  const selectedTemplate = useMemo(() => bootstrap.templates.find(t => t.id === selectedTemplateId) || null, [bootstrap.templates, selectedTemplateId]);
  const selectedProperty = useMemo(() => bootstrap.customers.flatMap(c => c.properties).find(p => p.id === selectedPropertyId) || null, [bootstrap.customers, selectedPropertyId]);

  const result = useMemo(() => {
    if (!selectedTemplate || !selectedProperty) {
      return { lineItems: [], subtotal: 0, tax: 0, total: 0, snapshot: {} } as ReturnType<typeof runPricingEngine>;
    }
    const chemicals = selectedTemplate.recipeItems.map((ri) => ({
      id: ri.chemical.id,
      name: ri.chemical.name,
      usageRatePer1000: ri.usageRatePer1000,
      packageSize: ri.chemical.packageSize,
      packageCost: ri.chemical.packageCost,
      wastePercent: ri.chemical.wastePercent,
      useFor: ri.useFor,
    }));
    return runPricingEngine({
      propertyType: selectedProperty.propertyType,
      area,
      infestationMultiplier: 1,
      complexityMultiplier: 1,
      interior,
      exterior,
      chemicals,
      setupTime: selectedTemplate.setupTimeHrs,
      timePer1000: selectedTemplate.timePer1000Hrs,
      hourlyWage,
      burdenPercent,
      travelFixedMinutes,
      travelMinutesPerMile,
      travelMiles,
      manualLaborAdderHours: 0,
      mode,
      marginOrMarkup,
      fees,
      discounts,
      taxRate,
      roundingRule,
      minimum,
      tierRules: selectedTemplate.tierRules as any,
      template: {
        residentialMultiplier: selectedTemplate.residentialMultiplier,
        commercialMultiplier: selectedTemplate.commercialMultiplier,
        defaultInfestationMultiplier: selectedTemplate.defaultInfestationMultiplier,
        defaultComplexityMultiplier: selectedTemplate.defaultComplexityMultiplier,
        minPrice: selectedTemplate.minPrice,
        mainUnit: selectedTemplate.mainUnit,
      },
      currency: 'USD',
      unitsArea: 'ft2',
    });
  }, [selectedTemplate, selectedProperty, area, interior, exterior, hourlyWage, burdenPercent, travelFixedMinutes, travelMinutesPerMile, travelMiles, mode, marginOrMarkup, fees, discounts, taxRate, roundingRule, minimum]);

  const onSaveQuote = async () => {
    if (!selectedTemplate || !selectedProperty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('/api/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          serviceTemplateId: selectedTemplate.id,
          // We will pass the same object used for runPricingEngine
          pricingInput: {
            propertyType: selectedProperty.propertyType,
            area,
            infestationMultiplier: 1,
            complexityMultiplier: 1,
            interior,
            exterior,
            chemicals: selectedTemplate.recipeItems.map((ri) => ({
              id: ri.chemical.id,
              name: ri.chemical.name,
              usageRatePer1000: ri.usageRatePer1000,
              packageSize: ri.chemical.packageSize,
              packageCost: ri.chemical.packageCost,
              wastePercent: ri.chemical.wastePercent,
              useFor: ri.useFor,
            })),
            setupTime: selectedTemplate.setupTimeHrs,
            timePer1000: selectedTemplate.timePer1000Hrs,
            hourlyWage,
            burdenPercent,
            travelFixedMinutes,
            travelMinutesPerMile,
            travelMiles,
            manualLaborAdderHours: 0,
            mode,
            marginOrMarkup,
            fees,
            discounts,
            taxRate,
            roundingRule,
            minimum,
            tierRules: selectedTemplate.tierRules,
            template: {
              residentialMultiplier: selectedTemplate.residentialMultiplier,
              commercialMultiplier: selectedTemplate.commercialMultiplier,
              defaultInfestationMultiplier: selectedTemplate.defaultInfestationMultiplier,
              defaultComplexityMultiplier: selectedTemplate.defaultComplexityMultiplier,
              minPrice: selectedTemplate.minPrice,
              mainUnit: selectedTemplate.mainUnit,
            },
            currency: 'USD',
            unitsArea: 'ft2',
          },
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      window.location.href = `/quotes/${data.id}`;
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const onSavePreset = async () => {
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName || `Preset ${new Date().toLocaleDateString()}`,
          pricingMode: mode,
          marginOrMarkup,
          hourlyWage,
          burdenPercent,
          taxRate,
          roundingRule,
          minimum,
          travelFixedMin: travelFixedMinutes,
          travelMinsPerMile: travelMinutesPerMile,
          fees,
          discounts,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { preset } = await res.json();
      setBootstrap((prev) => ({ ...prev, presets: [...prev.presets, preset] }));
      setSelectedPresetId(preset.id);
      setPresetOpen(false);
      setPresetName('');
    } catch (err) {
      // no-op minimal error handling
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <WizardSteps steps={wizardSteps} current={current} />
        <Card title={<span className="text-lg font-semibold">Step {current}: Configure quote</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer">
              <Select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                {bootstrap.customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Property">
              <Select value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)}>
                {bootstrap.customers.find(c => c.id === selectedCustomerId)?.properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.address}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Service template">
              <Select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                {bootstrap.templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Preset">
              <Select value={selectedPresetId} onChange={(e) => { setSelectedPresetId(e.target.value); const p = bootstrap.presets.find(x => x.id === e.target.value); if (p) applyPreset(p); }}>
                <option value="">Custom</option>
                {bootstrap.presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Interior">
              <Select value={interior ? 'yes' : 'no'} onChange={(e) => setInterior(e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </FormField>
            <FormField label="Exterior">
              <Select value={exterior ? 'yes' : 'no'} onChange={(e) => setExterior(e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </FormField>

            <FormField label="Area">
              <Input type="number" value={area} min={0} onChange={(e) => setArea(Number(e.target.value))} />
            </FormField>
            <FormField label="Mode">
              <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="margin">Margin</option>
                <option value="markup">Markup</option>
              </Select>
            </FormField>
            <FormField label="Margin / Markup">
              <Input type="number" step="0.01" value={marginOrMarkup} onChange={(e) => setMarginOrMarkup(Number(e.target.value))} />
            </FormField>
            <FormField label="Hourly wage ($)">
              <Input type="number" step="0.25" value={hourlyWage} onChange={(e) => setHourlyWage(Number(e.target.value))} />
            </FormField>
            <FormField label="Burden (%)">
              <Input type="number" step="0.01" value={burdenPercent} onChange={(e) => setBurdenPercent(Number(e.target.value))} />
            </FormField>
            <FormField label="Tax rate (%)">
              <Input type="number" step="0.0001" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </FormField>
            <FormField label="Rounding">
              <Select value={roundingRule} onChange={(e) => setRoundingRule(e.target.value as any)}>
                <option value="nearest_1">Nearest $1</option>
                <option value="nearest_5">Nearest $5</option>
                <option value="psychological_9">Psychological .99</option>
              </Select>
            </FormField>
            <FormField label="Minimum ($)">
              <Input type="number" step="1" value={minimum} onChange={(e) => setMinimum(Number(e.target.value))} />
            </FormField>
            <FormField label="Fees ($)">
              <Input type="number" step="1" value={fees} onChange={(e) => setFees(Number(e.target.value))} />
            </FormField>
            <FormField label="Discounts ($)">
              <Input type="number" step="1" value={discounts} onChange={(e) => setDiscounts(Number(e.target.value))} />
            </FormField>
            <FormField label="Travel fixed (min)">
              <Input type="number" step="1" value={travelFixedMinutes} onChange={(e) => setTravelFixedMinutes(Number(e.target.value))} />
            </FormField>
            <FormField label="Travel mins/mi">
              <Input type="number" step="0.1" value={travelMinutesPerMile} onChange={(e) => setTravelMinutesPerMile(Number(e.target.value))} />
            </FormField>
            <FormField label="Travel miles">
              <Input type="number" step="0.1" value={travelMiles} onChange={(e) => setTravelMiles(Number(e.target.value))} />
            </FormField>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button type="button" onClick={() => setCurrent((value) => Math.min(wizardSteps.length, value + 1))}>Next</Button>
            <Button type="button" variant="secondary" onClick={() => setCurrent((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button type="button" variant="secondary" onClick={() => setPresetOpen(true)}>Save preset</Button>
            <Button type="button" onClick={onSaveQuote} disabled={saving || !selectedTemplateId || !selectedPropertyId}>
              {saving ? 'Saving…' : 'Save quote'}
            </Button>
          </div>
          {saveError ? <p className="mt-2 text-sm text-red-600">{saveError}</p> : null}
        </Card>

        <Card title={<span className="text-lg font-semibold">Line items</span>}>
          <LineItemTable items={(result as any).lineItems || []} />
          <div className="mt-4 flex justify-between text-sm text-slate-700">
            <span>Subtotal</span>
            <span>${(result as any).subtotal?.toFixed?.(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-700">
            <span>Tax</span>
            <span>${(result as any).tax?.toFixed?.(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-slate-900">
            <span>Total</span>
            <span>${(result as any).total?.toFixed?.(2) || '0.00'}</span>
          </div>
        </Card>
      </div>
      <DebugPanel payload={(result as any).snapshot || {}} />

      <Modal open={presetOpen} onClose={() => setPresetOpen(false)} title="Save preset" actions={<>
        <Button variant="secondary" onClick={() => setPresetOpen(false)}>Cancel</Button>
        <Button onClick={onSavePreset}>Save</Button>
      </>}>
        <FormField label="Preset name">
          <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g., Summer 2025 Margin" />
        </FormField>
        <p className="mt-2 text-xs text-slate-500">This saves your current pricing controls for quick reuse.</p>
      </Modal>
    </div>
  );
}
