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
  { id: 1, label: 'Customer & Service', description: 'Pick customer, property, template' },
  { id: 2, label: 'Scope', description: 'Interior/Exterior and area' },
  { id: 3, label: 'Travel & Adjustments', description: 'Travel, fees, discounts' },
  { id: 4, label: 'Pricing', description: 'Mode, margin/markup, tax' },
  { id: 5, label: 'Review & Save', description: 'Review totals and save' },
];

type BootstrapData = {
  settings: any;
  customers: Array<{ id: string; name: string; properties: Array<{ id: string; address: string; propertyType: 'Residential'|'Commercial'; area: number }> }>;
  templates: Array<{ id: string; name: string; mainUnit: 'ft2'|'m2'|'linear_ft'|'each'; setupTimeHrs: number; timePer1000Hrs: number; minPrice: number; defaultInfestationMultiplier: number; defaultComplexityMultiplier: number; residentialMultiplier: number; commercialMultiplier: number; tierRules: any[]; recipeItems: Array<{ useFor: 'interior'|'exterior'|'both'; usageRatePer1000: number; chemical: { id: string; name: string; packageSize: number; packageCost: number; wastePercent: number } }> }>;
  presets: Array<{ id: string; name: string; pricingMode: 'margin'|'markup'; marginOrMarkup: number; hourlyWage: number; burdenPercent: number; taxRate: number; roundingRule: 'nearest_1'|'nearest_5'|'psychological_9'; minimum: number; travelFixedMin: number; travelMinsPerMile: number; fees: number; discounts: number }>;
};

const emptyBootstrap: BootstrapData = { settings: null, customers: [], templates: [], presets: [] };

const HISTORY_STORAGE_KEY = 'quoteWizard:history';

type QuoteSnapshot = {
  timestamp: number;
  customerId: string;
  customerName: string;
  propertyId: string;
  propertyName: string;
  templateId: string;
  templateName: string;
  presetId?: string | null;
  area: number;
  interior: boolean;
  exterior: boolean;
  mode: 'margin' | 'markup';
  marginOrMarkup: number;
  hourlyWage: number;
  burdenPercent: number;
  taxRate: number;
  roundingRule: 'nearest_1' | 'nearest_5' | 'psychological_9';
  minimum: number;
  fees: number;
  discounts: number;
  travelFixedMinutes: number;
  travelMinutesPerMile: number;
  travelMiles: number;
};

function loadHistory(): QuoteSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuoteSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(history: QuoteSnapshot[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore persistence errors (e.g., private mode)
  }
}

export default function QuoteWizardPage() {
  const [current, setCurrent] = useState(1);
  const [bootstrap, setBootstrap] = useState<BootstrapData>(emptyBootstrap);
  const [history, setHistory] = useState<QuoteSnapshot[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [customerInput, setCustomerInput] = useState('');
  const [propertyInput, setPropertyInput] = useState('');
  const [templateInput, setTemplateInput] = useState('');
  const [area, setArea] = useState<number>(0);
  const [areaInput, setAreaInput] = useState('');
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
  const [marginPercentInput, setMarginPercentInput] = useState('45');
  const [burdenPercentInput, setBurdenPercentInput] = useState('28');
  const [taxRateInput, setTaxRateInput] = useState('8.25');
  const [stepError, setStepError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const formatAreaInput = (value: number) => {
    if (!Number.isFinite(value) || value === 0) return '';
    return numberFormatter.format(value);
  };

  const updateArea = (value: number) => {
    setArea(value);
    setAreaInput(formatAreaInput(value));
  };

  const findCustomerById = (id: string) => bootstrap.customers.find((c) => c.id === id) || null;

  const findPropertyById = (id: string) => {
    for (const customer of bootstrap.customers) {
      const property = customer.properties.find((p) => p.id === id);
      if (property) {
        return { property, customer } as const;
      }
    }
    return null;
  };

  const findTemplateById = (id: string) => bootstrap.templates.find((t) => t.id === id) || null;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/quotes/bootstrap', { cache: 'no-store' });
        if (!res.ok) {
          setStepError('Failed to load bootstrap data. Please sign in or check API hosting.');
          return;
        }
        const data = (await res.json()) as BootstrapData;
        setBootstrap(data);
        const storedHistory = loadHistory();
        setHistory(storedHistory);

        const applyFromSnapshot = (snapshot: QuoteSnapshot) => {
          const templateMatch = findTemplateById(snapshot.templateId) || data.templates[0] || null;
          if (templateMatch) {
            setSelectedTemplateId(templateMatch.id);
            setTemplateInput(templateMatch.name);
          } else {
            setSelectedTemplateId('');
            setTemplateInput(snapshot.templateName || '');
          }

          const propertyMatch = findPropertyById(snapshot.propertyId);
          if (propertyMatch) {
            setSelectedCustomerId(propertyMatch.customer.id);
            setCustomerInput(propertyMatch.customer.name);
            setSelectedPropertyId(propertyMatch.property.id);
            setPropertyInput(propertyMatch.property.address);
            updateArea(snapshot.area ?? propertyMatch.property.area);
          } else {
            const customerMatch = findCustomerById(snapshot.customerId) || data.customers[0] || null;
            if (customerMatch) {
              setSelectedCustomerId(customerMatch.id);
              setCustomerInput(customerMatch.name);
              const defaultProperty = customerMatch.properties.find((p) => p.id === snapshot.propertyId) || customerMatch.properties[0];
              if (defaultProperty) {
                setSelectedPropertyId(defaultProperty.id);
                setPropertyInput(defaultProperty.address);
                updateArea(snapshot.area ?? defaultProperty.area);
              } else {
                setSelectedPropertyId('');
                setPropertyInput(snapshot.propertyName || '');
                updateArea(snapshot.area ?? 0);
              }
            } else {
              setSelectedCustomerId('');
              setCustomerInput(snapshot.customerName || '');
              setSelectedPropertyId('');
              setPropertyInput(snapshot.propertyName || '');
              updateArea(snapshot.area ?? 0);
            }
          }

          const presetMatch = data.presets.find((p) => p.id === snapshot.presetId);
          if (presetMatch) {
            setSelectedPresetId(presetMatch.id);
            applyPreset(presetMatch);
          } else {
            setSelectedPresetId('');
            setMode(snapshot.mode);
            setMarginOrMarkup(snapshot.marginOrMarkup);
            setHourlyWage(snapshot.hourlyWage);
            setBurdenPercent(snapshot.burdenPercent);
            setTaxRate(snapshot.taxRate);
            setRoundingRule(snapshot.roundingRule);
            setMinimum(snapshot.minimum);
            setFees(snapshot.fees);
            setDiscounts(snapshot.discounts);
            setTravelFixedMinutes(snapshot.travelFixedMinutes);
            setTravelMinutesPerMile(snapshot.travelMinutesPerMile);
          }

          setInterior(snapshot.interior);
          setExterior(snapshot.exterior);
          setTravelMiles(snapshot.travelMiles);
        };

        const lastSnapshot = storedHistory.at(-1);
        if (lastSnapshot) {
          applyFromSnapshot(lastSnapshot);
        } else {
          if (data.customers[0]) {
            const firstCustomer = data.customers[0];
            setSelectedCustomerId(firstCustomer.id);
            setCustomerInput(firstCustomer.name);
            if (firstCustomer.properties[0]) {
              const firstProperty = firstCustomer.properties[0];
              setSelectedPropertyId(firstProperty.id);
              setPropertyInput(firstProperty.address);
              updateArea(firstProperty.area);
            }
          }
          if (data.templates[0]) {
            setSelectedTemplateId(data.templates[0].id);
            setTemplateInput(data.templates[0].name);
          }
          if (data.presets[0]) {
            setSelectedPresetId(data.presets[0].id);
            applyPreset(data.presets[0]);
          }
        }
      } catch {
        setStepError('Network error loading bootstrap data.');
      }
    })();
  }, []);

  const handleCustomerSelect = (customerId: string) => {
    if (!customerId) {
      setSelectedCustomerId('');
      return;
    }
    const customer = findCustomerById(customerId);
    setSelectedCustomerId(customerId);
    setCustomerInput(customer?.name || '');
    setStepError(null);
    if (customer) {
      const existingProperty = customer.properties.find((p) => p.id === selectedPropertyId);
      if (!existingProperty) {
        const firstProperty = customer.properties[0];
        if (firstProperty) {
          setSelectedPropertyId(firstProperty.id);
          setPropertyInput(firstProperty.address);
          updateArea(firstProperty.area);
        } else {
          setSelectedPropertyId('');
          setPropertyInput('');
          updateArea(0);
        }
      }
    }
  };

  const handlePropertySelect = (propertyId: string) => {
    if (!propertyId) {
      setSelectedPropertyId('');
      return;
    }
    const match = findPropertyById(propertyId);
    setSelectedPropertyId(propertyId);
    if (match) {
      setSelectedCustomerId(match.customer.id);
      setCustomerInput(match.customer.name);
      setPropertyInput(match.property.address);
      updateArea(match.property.area);
    }
    setStepError(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId('');
      return;
    }
    const template = findTemplateById(templateId);
    setSelectedTemplateId(templateId);
    setTemplateInput(template?.name || '');
    setStepError(null);
  };

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

  const customerOptions = useMemo(() => {
    const options = new Map<string, { id: string; label: string }>();
    for (const customer of bootstrap.customers) {
      options.set(customer.name.toLowerCase(), { id: customer.id, label: customer.name });
    }
    for (const snapshot of history) {
      if (!snapshot.customerId) continue;
      const match = findCustomerById(snapshot.customerId);
      if (match) {
        options.set(match.name.toLowerCase(), { id: match.id, label: match.name });
      }
    }
    return Array.from(options.values());
  }, [bootstrap.customers, history]);

  const propertyOptions = useMemo(() => {
    const options = new Map<string, { id: string; label: string }>();
    for (const customer of bootstrap.customers) {
      for (const property of customer.properties) {
        options.set(property.address.toLowerCase(), { id: property.id, label: property.address });
      }
    }
    for (const snapshot of history) {
      if (!snapshot.propertyId) continue;
      const match = findPropertyById(snapshot.propertyId);
      if (match) {
        options.set(match.property.address.toLowerCase(), { id: match.property.id, label: match.property.address });
      }
    }
    return Array.from(options.values());
  }, [bootstrap.customers, history]);

  const templateOptions = useMemo(() => {
    const options = new Map<string, { id: string; label: string }>();
    for (const template of bootstrap.templates) {
      options.set(template.name.toLowerCase(), { id: template.id, label: template.name });
    }
    for (const snapshot of history) {
      if (!snapshot.templateId) continue;
      const match = findTemplateById(snapshot.templateId);
      if (match) {
        options.set(match.name.toLowerCase(), { id: match.id, label: match.name });
      }
    }
    return Array.from(options.values());
  }, [bootstrap.templates, history]);

  const resolveOptionId = (
    input: string,
    options: Array<{ id: string; label: string }>,
  ) => {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return '';
    const exact = options.find((option) => option.label.toLowerCase() === normalized);
    if (exact) return exact.id;
    const uniquePartial = options.filter((option) => option.label.toLowerCase().includes(normalized));
    return uniquePartial.length === 1 ? uniquePartial[0]?.id ?? '' : '';
  };

  const handleNext = async () => {
    if (current >= wizardSteps.length) return;

    if (current === 1) {
      let customerId = selectedCustomerId;
      let propertyId = selectedPropertyId;
      let templateId = selectedTemplateId;

      if (!customerId) {
        const resolved = resolveOptionId(customerInput, customerOptions);
        if (resolved) {
          customerId = resolved;
          handleCustomerSelect(resolved);
        }
      }

      if (!propertyId) {
        const resolved = resolveOptionId(propertyInput, propertyOptions);
        if (resolved) {
          propertyId = resolved;
          handlePropertySelect(resolved);
        }
      }

      if (!templateId) {
        const resolved = resolveOptionId(templateInput, templateOptions);
        if (resolved) {
          templateId = resolved;
          handleTemplateSelect(resolved);
        }
      }

      const hasTyped =
        customerInput.trim().length > 0 &&
        propertyInput.trim().length > 0 &&
        templateInput.trim().length > 0;

      if ((!customerId || !propertyId || !templateId) && hasTyped) {
        const payload = {
          customerName: customerInput.trim(),
          propertyAddress: propertyInput.trim(),
          propertyType: selectedProperty?.propertyType ?? 'Residential',
          area: Number(area) || 0,
          templateName: templateInput.trim(),
        };
        const createLocalEntities = () => {
          setOfflineMode(true);
          const localCustomerId = customerId || `local:customer:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
          const localPropertyId = propertyId || `local:property:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
          const localTemplateId = templateId || `local:template:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

          setBootstrap((prev) => {
            const nextCustomers = (() => {
              const existingCustomer = prev.customers.find((c) => c.id === localCustomerId);
              if (!existingCustomer) {
                return [
                  ...prev.customers,
                  {
                    id: localCustomerId,
                    name: customerInput.trim() || 'Customer',
                    properties: [
                      {
                        id: localPropertyId,
                        address: propertyInput.trim() || 'Property',
                        propertyType: (selectedProperty?.propertyType ?? 'Residential') as 'Residential' | 'Commercial',
                        area: Number(area) || 0,
                      },
                    ],
                  },
                ];
              }
              if (!existingCustomer.properties.some((p) => p.id === localPropertyId)) {
                existingCustomer.properties = [
                  ...existingCustomer.properties,
                  {
                    id: localPropertyId,
                    address: propertyInput.trim() || 'Property',
                    propertyType: (selectedProperty?.propertyType ?? 'Residential') as 'Residential' | 'Commercial',
                    area: Number(area) || 0,
                  },
                ];
              }
              return [...prev.customers];
            })();

            const templateDefaults = {
              id: localTemplateId,
              name: templateInput.trim() || 'General Service',
              mainUnit: 'ft2' as const,
              setupTimeHrs: 0.5,
              timePer1000Hrs: 0.35,
              minPrice: 95,
              defaultInfestationMultiplier: 1,
              defaultComplexityMultiplier: 1,
              residentialMultiplier: 1,
              commercialMultiplier: 1.15,
              tierRules: [] as any[],
              recipeItems: [] as any[],
            };
            const nextTemplates = prev.templates.some((t) => t.id === localTemplateId)
              ? prev.templates
              : [...prev.templates, templateDefaults];

            return { ...prev, customers: nextCustomers, templates: nextTemplates };
          });

          setSelectedCustomerId(localCustomerId);
          setSelectedPropertyId(localPropertyId);
          setSelectedTemplateId(localTemplateId);
          return { customerId: localCustomerId, propertyId: localPropertyId, templateId: localTemplateId };
        };

        try {
          const res = await fetch('/api/quotes/ensure-entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            // Fall back to local/offline entities so the flow can continue
            const ids = createLocalEntities();
            customerId = ids.customerId;
            propertyId = ids.propertyId;
            templateId = ids.templateId;
          } else {
            const data = await res.json();
            customerId = data.customer.id;
            propertyId = data.property.id;
            templateId = data.template.id;

            setBootstrap((prev) => {
              const nextCustomers = (() => {
                const existingCustomer = prev.customers.find((customer) => customer.id === data.customer.id);
                if (!existingCustomer) {
                  return [
                    ...prev.customers,
                    {
                      id: data.customer.id,
                      name: data.customer.name,
                      properties: [
                        {
                          id: data.property.id,
                          address: data.property.address,
                          propertyType: data.property.propertyType,
                          area: data.property.area ?? 0,
                        },
                      ],
                    },
                  ];
                }

                const properties = existingCustomer.properties.some((property) => property.id === data.property.id)
                  ? existingCustomer.properties.map((property) =>
                      property.id === data.property.id
                        ? {
                            id: data.property.id,
                            address: data.property.address,
                            propertyType: data.property.propertyType,
                            area: data.property.area ?? 0,
                          }
                        : property,
                    )
                  : [
                      ...existingCustomer.properties,
                      {
                        id: data.property.id,
                        address: data.property.address,
                        propertyType: data.property.propertyType,
                        area: data.property.area ?? 0,
                      },
                    ];

                return prev.customers.map((customer) =>
                  customer.id === data.customer.id
                    ? { ...customer, name: data.customer.name, properties }
                    : customer,
                );
              })();

              const templateDefaults = {
                id: data.template.id,
                name: data.template.name,
                mainUnit: 'ft2' as const,
                setupTimeHrs: 0.5,
                timePer1000Hrs: 0.35,
                minPrice: 95,
                defaultInfestationMultiplier: 1,
                defaultComplexityMultiplier: 1,
                residentialMultiplier: 1,
                commercialMultiplier: 1.15,
                tierRules: [] as any[],
                recipeItems: [] as any[],
              };
              const nextTemplates = prev.templates.some((template) => template.id === data.template.id)
                ? prev.templates.map((template) => (template.id === data.template.id ? { ...template, name: data.template.name } : template))
                : [...prev.templates, templateDefaults];

              const nextPresets = data.preset?.id
                ? prev.presets.some((preset) => preset.id === data.preset.id)
                  ? prev.presets.map((preset) => (preset.id === data.preset.id ? { ...preset, name: data.preset.name } : preset))
                  : [
                      ...prev.presets,
                      {
                        id: data.preset.id,
                        name: data.preset.name,
                        pricingMode: 'margin' as const,
                        marginOrMarkup: 0.45,
                        hourlyWage: 22,
                        burdenPercent: 0.28,
                        taxRate: 0.0825,
                        roundingRule: 'nearest_5' as const,
                        minimum: 95,
                        travelFixedMin: 15,
                        travelMinsPerMile: 1.5,
                        fees: 0,
                        discounts: 0,
                      },
                    ]
                : prev.presets;

              return {
                ...prev,
                customers: nextCustomers,
                templates: nextTemplates,
                presets: nextPresets,
              };
            });

            setSelectedCustomerId(customerId);
            setCustomerInput(data.customer.name);
            setSelectedPropertyId(propertyId);
            setPropertyInput(data.property.address);
            updateArea(data.property.area ?? 0);
            setSelectedTemplateId(templateId);
            setTemplateInput(data.template.name);
            if (data.preset?.id) {
              setSelectedPresetId(data.preset.id);
            }
          }
        } catch {
          // Network failure: fall back to local mode so the user can continue
          const hadIds = Boolean(customerId && propertyId && templateId);
          if (!hadIds) {
            const ids = createLocalEntities();
            customerId = ids.customerId;
            propertyId = ids.propertyId;
            templateId = ids.templateId;
          }
        }
      }

      if (!customerId || !propertyId || !templateId) {
        const hasTypedNames =
          customerInput.trim().length > 0 &&
          propertyInput.trim().length > 0 &&
          templateInput.trim().length > 0;
        if (!hasTypedNames) {
          setStepError('Enter a customer, property, and service template before continuing.');
          return;
        }
        // Proceed without IDs; we will ensure/create on save
      }
    }

    if (current === 2) {
      if (!interior && !exterior) {
        setStepError('Choose at least interior or exterior service before continuing.');
        return;
      }
      if (!Number.isFinite(area) || area <= 0) {
        setStepError('Enter the treatment area to keep your estimate accurate.');
        return;
      }
    }

    setStepError(null);
    setCurrent((value) => Math.min(wizardSteps.length, value + 1));
  };

  const percentToInput = (value: number) => {
    if (!Number.isFinite(value)) return '';
    const scaled = Number((value * 100).toFixed(4));
    return scaled.toString();
  };

  useEffect(() => {
    setMarginPercentInput(percentToInput(marginOrMarkup));
  }, [marginOrMarkup]);

  useEffect(() => {
    setBurdenPercentInput(percentToInput(burdenPercent));
  }, [burdenPercent]);

  useEffect(() => {
    setTaxRateInput(percentToInput(taxRate));
  }, [taxRate]);

  useEffect(() => {
    if (current !== 1) return;
    if (selectedCustomerId && selectedPropertyId && selectedTemplateId) {
      setStepError(null);
    }
  }, [current, selectedCustomerId, selectedPropertyId, selectedTemplateId]);

  useEffect(() => {
    if (current !== 2) return;
    if ((interior || exterior) && Number.isFinite(area) && area > 0) {
      setStepError(null);
    }
  }, [current, interior, exterior, area]);

  const buildSnapshot = (): QuoteSnapshot => ({
    timestamp: Date.now(),
    customerId: selectedCustomerId,
    customerName: customerInput,
    propertyId: selectedPropertyId,
    propertyName: propertyInput,
    templateId: selectedTemplateId,
    templateName: templateInput,
    presetId: selectedPresetId || null,
    area,
    interior,
    exterior,
    mode,
    marginOrMarkup,
    hourlyWage,
    burdenPercent,
    taxRate,
    roundingRule,
    minimum,
    fees,
    discounts,
    travelFixedMinutes,
    travelMinutesPerMile,
    travelMiles,
  });

  const saveSnapshotToHistory = (snapshot: QuoteSnapshot) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (item) =>
          item.customerId !== snapshot.customerId ||
          item.propertyId !== snapshot.propertyId ||
          item.templateId !== snapshot.templateId,
      );
      const next = [...filtered, snapshot].slice(-10);
      persistHistory(next);
      return next;
    });
  };

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

  const ensureEntitiesIfNeeded = async () => {
    let customerId = selectedCustomerId;
    let propertyId = selectedPropertyId;
    let templateId = selectedTemplateId;
    const hasTypedNames =
      customerInput.trim().length > 0 &&
      propertyInput.trim().length > 0 &&
      templateInput.trim().length > 0;

    if (customerId && propertyId && templateId) {
      return { ok: true, customerId, propertyId, templateId } as const;
    }
    if (!hasTypedNames) {
      setSaveError('Enter a customer, property, and service template before saving.');
      return { ok: false } as const;
    }

    try {
      const res = await fetch('/api/quotes/ensure-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerInput.trim(),
          propertyAddress: propertyInput.trim(),
          propertyType: selectedProperty?.propertyType ?? 'Residential',
          area: Number(area) || 0,
          templateName: templateInput.trim(),
        }),
      });
      if (res.status === 401) {
        setSaveError('Please sign in to save quotes.');
        return { ok: false } as const;
      }
      if (!res.ok) {
        setSaveError('Could not create records. Check database connection and try again.');
        return { ok: false } as const;
      }
      const data = await res.json();

      setBootstrap((prev) => {
        const nextCustomers = (() => {
          const existingCustomer = prev.customers.find((customer) => customer.id === data.customer.id);
          if (!existingCustomer) {
            return [
              ...prev.customers,
              {
                id: data.customer.id,
                name: data.customer.name,
                properties: [
                  {
                    id: data.property.id,
                    address: data.property.address,
                    propertyType: data.property.propertyType,
                    area: data.property.area ?? 0,
                  },
                ],
              },
            ];
          }

          const properties = existingCustomer.properties.some((property) => property.id === data.property.id)
            ? existingCustomer.properties.map((property) =>
                property.id === data.property.id
                  ? {
                      id: data.property.id,
                      address: data.property.address,
                      propertyType: data.property.propertyType,
                      area: data.property.area ?? 0,
                    }
                  : property,
              )
            : [
                ...existingCustomer.properties,
                {
                  id: data.property.id,
                  address: data.property.address,
                  propertyType: data.property.propertyType,
                  area: data.property.area ?? 0,
                },
              ];

          return prev.customers.map((customer) =>
            customer.id === data.customer.id ? { ...customer, name: data.customer.name, properties } : customer,
          );
        })();

        const templateDefaults = {
          id: data.template.id,
          name: data.template.name,
          mainUnit: 'ft2' as const,
          setupTimeHrs: 0.5,
          timePer1000Hrs: 0.35,
          minPrice: 95,
          defaultInfestationMultiplier: 1,
          defaultComplexityMultiplier: 1,
          residentialMultiplier: 1,
          commercialMultiplier: 1.15,
          tierRules: [] as any[],
          recipeItems: [] as any[],
        };
        const nextTemplates = prev.templates.some((template) => template.id === data.template.id)
          ? prev.templates.map((template) => (template.id === data.template.id ? { ...template, name: data.template.name } : template))
          : [...prev.templates, templateDefaults];

        const nextPresets = data.preset?.id
          ? prev.presets.some((preset) => preset.id === data.preset.id)
            ? prev.presets.map((preset) => (preset.id === data.preset.id ? { ...preset, name: data.preset.name } : preset))
            : [
                ...prev.presets,
                {
                  id: data.preset.id,
                  name: data.preset.name,
                  pricingMode: 'margin' as const,
                  marginOrMarkup: 0.45,
                  hourlyWage: 22,
                  burdenPercent: 0.28,
                  taxRate: 0.0825,
                  roundingRule: 'nearest_5' as const,
                  minimum: 95,
                  travelFixedMin: 15,
                  travelMinsPerMile: 1.5,
                  fees: 0,
                  discounts: 0,
                },
              ]
          : prev.presets;

        return {
          ...prev,
          customers: nextCustomers,
          templates: nextTemplates,
          presets: nextPresets,
        };
      });

      setSelectedCustomerId(data.customer.id);
      setCustomerInput(data.customer.name);
      setSelectedPropertyId(data.property.id);
      setPropertyInput(data.property.address);
      updateArea(data.property.area ?? 0);
      setSelectedTemplateId(data.template.id);
      setTemplateInput(data.template.name);
      if (data.preset?.id) {
        setSelectedPresetId(data.preset.id);
      }

      return {
        ok: true,
        customerId: data.customer.id,
        propertyId: data.property.id,
        templateId: data.template.id,
        property: data.property,
        template: data.template,
      } as const;
    } catch {
      setSaveError('Network error creating records.');
      return { ok: false } as const;
    }
  };

  const onSaveQuote = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const ensured = await ensureEntitiesIfNeeded();
      if (!('ok' in ensured) || !ensured.ok) {
        return;
      }

      const propertyIdToUse = ensured.propertyId || selectedPropertyId;
      const templateIdToUse = ensured.templateId || selectedTemplateId;

      const propertyTypeToUse = selectedProperty?.propertyType || ensured.property?.propertyType || 'Residential';
      const recipeItems = selectedTemplate?.recipeItems || [];
      const setupTimeHrs = selectedTemplate?.setupTimeHrs ?? 0.5;
      const timePer1000Hrs = selectedTemplate?.timePer1000Hrs ?? 0.35;
      const minPrice = selectedTemplate?.minPrice ?? 95;
      const residentialMultiplier = selectedTemplate?.residentialMultiplier ?? 1;
      const commercialMultiplier = selectedTemplate?.commercialMultiplier ?? 1.15;
      const defaultInfestationMultiplier = selectedTemplate?.defaultInfestationMultiplier ?? 1;
      const defaultComplexityMultiplier = selectedTemplate?.defaultComplexityMultiplier ?? 1;
      const mainUnit = selectedTemplate?.mainUnit ?? 'ft2';
      const tierRules = (selectedTemplate?.tierRules as any) ?? [];
      const response = await fetch('/api/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: propertyIdToUse,
          serviceTemplateId: templateIdToUse,
          pricingInput: {
            propertyType: propertyTypeToUse,
            area,
            infestationMultiplier: 1,
            complexityMultiplier: 1,
            interior,
            exterior,
            chemicals: recipeItems.map((ri) => ({
              id: ri.chemical.id,
              name: ri.chemical.name,
              usageRatePer1000: ri.usageRatePer1000,
              packageSize: ri.chemical.packageSize,
              packageCost: ri.chemical.packageCost,
              wastePercent: ri.chemical.wastePercent,
              useFor: ri.useFor,
            })),
            setupTime: setupTimeHrs,
            timePer1000: timePer1000Hrs,
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
            tierRules,
            template: {
              residentialMultiplier,
              commercialMultiplier,
              defaultInfestationMultiplier,
              defaultComplexityMultiplier,
              minPrice,
              mainUnit,
            },
            currency: 'USD',
            unitsArea: 'ft2',
          },
        }),
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Please sign in to save quotes.');
      }
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      saveSnapshotToHistory(buildSnapshot());
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
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr] pb-6">
      <div className="space-y-6">
        <WizardSteps steps={wizardSteps} current={current} />
        <Card title={<span className="text-lg font-semibold">Step {current}: {wizardSteps[current - 1]?.label}</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            {current === 1 && (
              <>
                <FormField label="Customer">
                  <div className="relative">
                    <Input
                      value={customerInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomerInput(value);
                        if (!value.trim()) {
                          setSelectedCustomerId('');
                          setSelectedPropertyId('');
                          setPropertyInput('');
                          updateArea(0);
                          return;
                        }
                        const match = customerOptions.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
                        if (match) {
                          handleCustomerSelect(match.id);
                        }
                      }}
                      list="quote-customer-options"
                      placeholder="Start typing a customer"
                      autoComplete="off"
                    />
                    <datalist id="quote-customer-options">
                      {customerOptions.map((option) => (
                        <option key={option.id} value={option.label} />
                      ))}
                    </datalist>
                  </div>
                </FormField>
                <FormField label="Property">
                  <div className="relative">
                    <Input
                      value={propertyInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPropertyInput(value);
                        if (!value.trim()) {
                          setSelectedPropertyId('');
                          updateArea(0);
                          return;
                        }
                        const match = propertyOptions.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
                        if (match) {
                          handlePropertySelect(match.id);
                        }
                      }}
                      list="quote-property-options"
                      placeholder="Start typing a property"
                      autoComplete="off"
                    />
                    <datalist id="quote-property-options">
                      {propertyOptions.map((option) => (
                        <option key={option.id} value={option.label} />
                      ))}
                    </datalist>
                  </div>
                </FormField>
                <FormField label="Service template">
                  <div className="relative">
                    <Input
                      value={templateInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTemplateInput(value);
                        if (!value.trim()) {
                          setSelectedTemplateId('');
                          return;
                        }
                        const match = templateOptions.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
                        if (match) {
                          handleTemplateSelect(match.id);
                        }
                      }}
                      list="quote-template-options"
                      placeholder="Start typing a template"
                      autoComplete="off"
                    />
                    <datalist id="quote-template-options">
                      {templateOptions.map((option) => (
                        <option key={option.id} value={option.label} />
                      ))}
                    </datalist>
                  </div>
                </FormField>
                <FormField label="Preset">
                  <Select value={selectedPresetId} onChange={(e) => { setSelectedPresetId(e.target.value); const p = bootstrap.presets.find(x => x.id === e.target.value); if (p) applyPreset(p); }}>
                    <option value="">Custom</option>
                    {bootstrap.presets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </FormField>
              </>
            )}

            {current === 2 && (
              <>
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
                  <Input
                    value={areaInput}
                    inputMode="decimal"
                    placeholder="15,000"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value.trim()) {
                        setArea(0);
                        setAreaInput('');
                        return;
                      }
                      const numeric = Number(value.replace(/,/g, ''));
                      if (Number.isNaN(numeric)) {
                        setAreaInput(value);
                        return;
                      }
                      updateArea(numeric);
                    }}
                  />
                </FormField>
              </>
            )}

            {current === 3 && (
              <>
                <FormField label="Travel fixed (min)">
                  <Input type="number" step="1" value={travelFixedMinutes} onChange={(e) => setTravelFixedMinutes(Number(e.target.value))} />
                </FormField>
                <FormField label="Travel mins/mi">
                  <Input type="number" step="0.1" value={travelMinutesPerMile} onChange={(e) => setTravelMinutesPerMile(Number(e.target.value))} />
                </FormField>
                <FormField label="Travel miles">
                  <Input type="number" step="0.1" value={travelMiles} onChange={(e) => setTravelMiles(Number(e.target.value))} />
                </FormField>
                <FormField label="Fees ($)">
                  <Input type="number" step="1" value={fees} onChange={(e) => setFees(Number(e.target.value))} />
                </FormField>
                <FormField label="Discounts ($)">
                  <Input type="number" step="1" value={discounts} onChange={(e) => setDiscounts(Number(e.target.value))} />
                </FormField>
              </>
            )}

            {current === 4 && (
              <>
                <FormField label="Mode">
                  <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                    <option value="margin">Margin</option>
                    <option value="markup">Markup</option>
                  </Select>
                </FormField>
                <FormField label="Margin">
                  <div className="relative">
                    <Input
                      value={marginPercentInput}
                      inputMode="decimal"
                      placeholder="45"
                      className="pr-10"
                      onChange={(e) => {
                        const value = e.target.value;
                        setMarginPercentInput(value);
                        if (!value.trim()) {
                          setMarginOrMarkup(0);
                          return;
                        }
                        const numeric = Number(value);
                        if (Number.isNaN(numeric)) return;
                        setMarginOrMarkup(numeric / 100);
                      }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">%</span>
                  </div>
                </FormField>
                <FormField label="Hourly wage ($)">
                  <Input type="number" step="0.25" value={hourlyWage} onChange={(e) => setHourlyWage(Number(e.target.value))} />
                </FormField>
                <FormField label="Burden">
                  <div className="relative">
                    <Input
                      value={burdenPercentInput}
                      inputMode="decimal"
                      placeholder="28"
                      className="pr-10"
                      onChange={(e) => {
                        const value = e.target.value;
                        setBurdenPercentInput(value);
                        if (!value.trim()) {
                          setBurdenPercent(0);
                          return;
                        }
                        const numeric = Number(value);
                        if (Number.isNaN(numeric)) return;
                        setBurdenPercent(numeric / 100);
                      }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">%</span>
                  </div>
                </FormField>
                <FormField label="Tax rate">
                  <div className="relative">
                    <Input
                      value={taxRateInput}
                      inputMode="decimal"
                      placeholder="8.25"
                      className="pr-10"
                      onChange={(e) => {
                        const value = e.target.value;
                        setTaxRateInput(value);
                        if (!value.trim()) {
                          setTaxRate(0);
                          return;
                        }
                        const numeric = Number(value);
                        if (Number.isNaN(numeric)) return;
                        setTaxRate(numeric / 100);
                      }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">%</span>
                  </div>
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
              </>
            )}

            {current === 5 && (
              <>
                <p className="col-span-2 text-sm text-slate-600">Review the line items and totals on the right. When you're satisfied, save the quote.</p>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 pb-2 sticky bottom-0 z-10 bg-white/60 backdrop-blur rounded-xl p-2">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleNext();
              }}
              disabled={current >= wizardSteps.length}
              className="min-w-[80px] touch-manipulation"
            >
              Next
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStepError(null);
                setCurrent((value) => Math.max(1, value - 1));
              }}
              disabled={current === 1}
              className="min-w-[80px] touch-manipulation"
            >
              Previous
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPresetOpen(true)} className="sm:ml-auto touch-manipulation">Save preset</Button>
            <Button type="button" onClick={onSaveQuote} disabled={saving || !selectedTemplateId || !selectedPropertyId} className="touch-manipulation">
              {saving ? 'Saving…' : 'Save quote'}
            </Button>
          </div>
          {stepError ? (
            <p role="alert" aria-live="assertive" className="mt-2 text-sm text-red-600">
              {stepError}
            </p>
          ) : null}
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
