import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { requireOrgId } from '@/lib/auth/org';
import { allocateQuoteNumber } from '@/lib/quotes/sequence';
import { PricingInputSchema } from '@/lib/pricing/schema';
import { runPricingEngine } from '@/lib/pricing/engine';
import { logError, logInfo } from '@/lib/log';

const FORM_KEYS = [
  'customerId',
  'newCustomerName',
  'propertyId',
  'newPropertyName',
  'propertyType',
  'area',
  'templateId',
  'hourlyWage',
  'burdenPercent',
  'travelFixedMinutes',
  'travelMinutesPerMile',
  'travelMiles',
  'mode',
  'marginOrMarkup',
  'fees',
  'discounts',
  'taxRate',
  'roundingRule',
  'minimum',
  'pricingPresetId',
];

type QuoteFormFlash = {
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const booleanField = z.preprocess((value) => value === 'on' || value === 'true', z.boolean());

const numberField = (message: string) =>
  z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return undefined;
      }
      const parsed = Number(trimmed.replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }
    return value;
  }, z.number({ invalid_type_error: message, required_error: message }));

const quoteFormSchema = z
  .object({
    customerId: z.string().trim().optional().transform((val) => (val ? val : undefined)),
    newCustomerName: z.string().trim().optional().transform((val) => (val ? val : undefined)),
    propertyId: z.string().trim().optional().transform((val) => (val ? val : undefined)),
    newPropertyName: z.string().trim().optional().transform((val) => (val ? val : undefined)),
    propertyType: z.enum(['Residential', 'Commercial']),
    area: numberField('Enter the serviced area in square feet.').refine((val) => val > 0, {
      message: 'Area must be greater than 0.',
    }),
    templateId: z.string().min(1, 'Select a service template.'),
    interior: booleanField,
    exterior: booleanField,
    hourlyWage: numberField('Enter an hourly wage.').refine((val) => val >= 0, {
      message: 'Hourly wage must be zero or positive.',
    }),
    burdenPercent: numberField('Enter burden percent as a decimal.').refine((val) => val >= 0 && val <= 1, {
      message: 'Burden percent must be between 0 and 1.',
    }),
    travelFixedMinutes: numberField('Enter fixed travel minutes.').refine((val) => val >= 0, {
      message: 'Travel minutes must be zero or positive.',
    }),
    travelMinutesPerMile: numberField('Enter travel minutes per mile.').refine((val) => val >= 0, {
      message: 'Travel minutes per mile must be zero or positive.',
    }),
    travelMiles: numberField('Enter travel miles.').refine((val) => val >= 0, {
      message: 'Travel miles must be zero or positive.',
    }),
    mode: z.enum(['margin', 'markup']),
    marginOrMarkup: numberField('Provide a margin or markup value.').refine((val) => val >= 0 && val <= 0.95, {
      message: 'Margin or markup must be between 0 and 0.95.',
    }),
    fees: numberField('Fees must be zero or positive.').refine((val) => val >= 0, {
      message: 'Fees must be zero or positive.',
    }),
    discounts: numberField('Discounts must be zero or positive.').refine((val) => val >= 0, {
      message: 'Discounts must be zero or positive.',
    }),
    taxRate: numberField('Tax rate should be a decimal (e.g., 0.0825).').refine((val) => val >= 0 && val <= 0.25, {
      message: 'Tax rate must be between 0 and 0.25.',
    }),
    roundingRule: z.enum(['nearest_1', 'nearest_5', 'psychological_9']),
    minimum: numberField('Minimum price must be zero or positive.').refine((val) => val >= 0, {
      message: 'Minimum price must be zero or positive.',
    }),
    pricingPresetId: z.string().trim().optional().transform((val) => (val ? val : undefined)),
  })
  .superRefine((data, ctx) => {
    if (!data.customerId && !data.newCustomerName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a customer or enter a new name.', path: ['customerId'] });
    }
    if (!data.propertyId && !data.newPropertyName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a property or enter a new name.', path: ['propertyId'] });
    }
    if (!data.interior && !data.exterior) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select at least one scope (interior or exterior).', path: ['interior'] });
    }
  });

function collectValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const key of FORM_KEYS) {
    const raw = formData.get(key);
    if (typeof raw === 'string') {
      values[key] = raw;
    }
  }
  values.interior = formData.get('interior') === 'on' ? 'on' : 'off';
  values.exterior = formData.get('exterior') === 'on' ? 'on' : 'off';
  return values;
}

function setQuoteFlash(payload: QuoteFormFlash) {
  cookies().set('aa.quote.flash', JSON.stringify(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60,
  });
}

async function createQuote(formData: FormData) {
  'use server';
  const headersList = headers();
  await requireUser();
  const orgId = await requireOrgId();

  const parsed = quoteFormSchema.safeParse({
    customerId: formData.get('customerId'),
    newCustomerName: formData.get('newCustomerName'),
    propertyId: formData.get('propertyId'),
    newPropertyName: formData.get('newPropertyName'),
    propertyType: formData.get('propertyType'),
    area: formData.get('area'),
    templateId: formData.get('templateId'),
    interior: formData.get('interior'),
    exterior: formData.get('exterior'),
    hourlyWage: formData.get('hourlyWage'),
    burdenPercent: formData.get('burdenPercent'),
    travelFixedMinutes: formData.get('travelFixedMinutes'),
    travelMinutesPerMile: formData.get('travelMinutesPerMile'),
    travelMiles: formData.get('travelMiles'),
    mode: formData.get('mode'),
    marginOrMarkup: formData.get('marginOrMarkup'),
    fees: formData.get('fees'),
    discounts: formData.get('discounts'),
    taxRate: formData.get('taxRate'),
    roundingRule: formData.get('roundingRule'),
    minimum: formData.get('minimum'),
    pricingPresetId: formData.get('pricingPresetId'),
  });

  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
    );
    setQuoteFlash({
      message: 'Please correct the highlighted fields.',
      fieldErrors,
      values: collectValues(formData),
    });
    return redirect('/quotes/new');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const data = parsed.data;

      const customer = data.customerId
        ? await tx.customer.findFirst({ where: { id: data.customerId, orgId } })
        : await tx.customer.upsert({
            where: { orgId_name: { orgId, name: data.newCustomerName! } },
            update: {},
            create: { orgId, name: data.newCustomerName! },
          });

      if (!customer) {
        throw new Error('Customer not found.');
      }

      let property = data.propertyId
        ? await tx.property.findFirst({ where: { id: data.propertyId, orgId } })
        : await tx.property.findFirst({ where: { orgId, name: data.newPropertyName! } });

      if (!property && data.newPropertyName) {
        property = await tx.property.create({
          data: {
            orgId,
            name: data.newPropertyName,
            customerId: customer.id,
            propertyType: data.propertyType,
            area: data.area,
          },
        });
      }

      if (!property) {
        throw new Error('Property not found.');
      }

      if (property.customerId !== customer.id) {
        property = await tx.property.update({
          where: { id: property.id },
          data: { customerId: customer.id },
        });
      }

      if (property.area !== data.area || property.propertyType !== data.propertyType) {
        property = await tx.property.update({
          where: { id: property.id },
          data: {
            area: data.area,
            propertyType: { set: data.propertyType },
          },
        });
      }

      const template = await tx.serviceTemplate.findFirst({
        where: { id: data.templateId, orgId },
        include: {
          chemicals: {
            include: {
              chemical: true,
            },
          },
        },
      });

      if (!template) {
        throw new Error('Template not found.');
      }

      let tierRulesData: unknown[] = [];
      if (template.tierRules) {
        try {
          const raw = template.tierRules.trim();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              tierRulesData = parsed;
            }
          }
        } catch {
          tierRulesData = [];
        }
      }

      const pricingInput = PricingInputSchema.parse({
        propertyType: data.propertyType,
        area: data.area,
        infestationMultiplier: template.defaultInfestationMultiplier,
        complexityMultiplier: template.defaultComplexityMultiplier,
        interior: data.interior,
        exterior: data.exterior,
        chemicals: template.chemicals.map((item) => ({
          id: item.chemicalId,
          name: item.chemical.name,
          usageRatePer1000: item.usageRatePer1000,
          packageSize: item.chemical.packageSize,
          packageUnit: item.chemical.packageUnit as 'oz' | 'lb' | 'gal' | 'l' | 'ml' | 'kg' | 'each',
          packageCost: item.chemical.packageCost,
          wastePercent: item.chemical.wastePercent,
          useFor: item.useFor as 'interior' | 'exterior' | 'both',
        })),
        setupTime: template.setupTimeHrs,
        timePer1000: template.timePer1000Hrs,
        hourlyWage: data.hourlyWage,
        burdenPercent: data.burdenPercent,
        travelFixedMinutes: data.travelFixedMinutes,
        travelMinutesPerMile: data.travelMinutesPerMile,
        travelMiles: data.travelMiles,
        mode: data.mode,
        marginOrMarkup: data.marginOrMarkup,
        fees: data.fees,
        discounts: data.discounts,
        taxRate: data.taxRate,
        roundingRule: data.roundingRule,
        minimum: Math.max(data.minimum, template.minPrice),
        tierRules: tierRulesData,
        template: {
          mainUnit: template.mainUnit as 'ft2' | 'm2' | 'linear_ft' | 'each',
          minPrice: template.minPrice,
          residentialMultiplier: template.residentialMultiplier,
          commercialMultiplier: template.commercialMultiplier,
          defaultInfestationMultiplier: template.defaultInfestationMultiplier,
          defaultComplexityMultiplier: template.defaultComplexityMultiplier,
        },
        currency: 'USD',
        unitsArea: 'ft2',
      });

      const breakdown = runPricingEngine(pricingInput);
      const breakdownPayload = JSON.stringify(breakdown);

      const quoteNumber = await allocateQuoteNumber(orgId, tx);

      const quote = await tx.quote.create({
        data: {
          orgId,
          quoteNumber,
          customerId: customer.id,
          propertyId: property.id,
          serviceTemplateId: template.id,
          pricingPresetId: data.pricingPresetId ?? null,
          propertyType: data.propertyType,
          area: data.area,
          interior: data.interior,
          exterior: data.exterior,
          pricingMode: data.mode,
          marginOrMarkup: data.marginOrMarkup,
          hourlyWage: data.hourlyWage,
          burdenPercent: data.burdenPercent,
          travelFixedMinutes: data.travelFixedMinutes,
          travelMinutesPerMile: data.travelMinutesPerMile,
          travelMiles: data.travelMiles,
          fees: data.fees,
          discounts: data.discounts,
          taxRate: data.taxRate,
          roundingRule: data.roundingRule,
          minimum: data.minimum,
          subtotal: breakdown.subtotal,
          tax: breakdown.tax,
          total: breakdown.total,
          currency: pricingInput.currency,
          breakdown: breakdownPayload,
        },
      });

      if (breakdown.lineItems.length > 0) {
        await tx.quoteItem.createMany({
          data: breakdown.lineItems.map((item) => ({
            orgId,
            quoteId: quote.id,
            kind: item.kind,
            label: item.label,
            amount: item.amount,
            quantity: item.qty ?? null,
            unit: item.unit ?? null,
            unitCost: item.unitCost ?? null,
          })),
        });
      }

      return quote;
    });

    cookies().set('aa.quote.flash', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    revalidatePath('/quotes');
    logInfo('quote.create.success', { quoteId: result.id, orgId, requestId: headersList.get('x-request-id') ?? undefined });
    return redirect(`/quotes/${result.id}`);
  } catch (error) {
    logError('quote.create.failure', {
      error: error instanceof Error ? error.message : 'unknown-error',
      orgId,
      requestId: headersList.get('x-request-id') ?? undefined,
    });
    setQuoteFlash({ message: 'Unable to save quote. Please try again.', values: collectValues(formData) });
    return redirect('/quotes/new');
  }
}

export default async function NewQuotePage() {
  await requireUser();
  const orgId = await requireOrgId();

  const [customers, templates, presets] = await Promise.all([
    prisma.customer.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
      include: { properties: { orderBy: { name: 'asc' } } },
    }),
    prisma.serviceTemplate.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    }),
    prisma.pricingPreset.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    }),
  ]);

  const flashCookie = cookies().get('aa.quote.flash');
  let flash: QuoteFormFlash = {};
  if (flashCookie?.value) {
    try {
      flash = JSON.parse(flashCookie.value) as QuoteFormFlash;
    } catch {
      flash = {};
    }
  }

  const values = flash.values ?? {};
  const fieldErrors = flash.fieldErrors ?? {};

  const preset = presets[0];

  const getValue = (key: string, fallback: string) => values[key] ?? fallback;
  const checkboxChecked = (key: string, fallback: boolean) =>
    values[key] ? values[key] === 'on' : fallback;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Create quote</h1>
      <p className="mt-2 text-sm text-slate-600">Submit the form to calculate pricing and save the quote.</p>
      {flash.message ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {flash.message}
        </p>
      ) : null}
      <form action={createQuote} className="mt-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Customer</h2>
          <div>
            <label className="block text-sm font-medium" htmlFor="customerId">
              Existing customer
            </label>
            <select
              id="customerId"
              name="customerId"
              defaultValue={getValue('customerId', '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">-- Select customer --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {fieldErrors.customerId ? (
              <small className="text-sm text-red-600">{fieldErrors.customerId}</small>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="newCustomerName">
              New customer name
            </label>
            <input
              id="newCustomerName"
              name="newCustomerName"
              type="text"
              defaultValue={getValue('newCustomerName', '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="Optional"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Property</h2>
          <div>
            <label className="block text-sm font-medium" htmlFor="propertyId">
              Existing property
            </label>
            <select
              id="propertyId"
              name="propertyId"
              defaultValue={getValue('propertyId', '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">-- Select property --</option>
              {customers.flatMap((customer) =>
                customer.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                )),
              )}
            </select>
            {fieldErrors.propertyId ? (
              <small className="text-sm text-red-600">{fieldErrors.propertyId}</small>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="newPropertyName">
              New property name
            </label>
            <input
              id="newPropertyName"
              name="newPropertyName"
              type="text"
              defaultValue={getValue('newPropertyName', '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="propertyType">
                Property type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                defaultValue={getValue('propertyType', 'Residential')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                required
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="area">
                Area (sq ft)
              </label>
              <input
                id="area"
                name="area"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('area', '2000')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
              {fieldErrors.area ? <small className="text-sm text-red-600">{fieldErrors.area}</small> : null}
            </div>
          </div>
          <fieldset className="flex items-center gap-6">
            <legend className="text-sm font-medium">Scope</legend>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="interior" defaultChecked={checkboxChecked('interior', true)} /> Interior
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="exterior" defaultChecked={checkboxChecked('exterior', true)} /> Exterior
            </label>
            {fieldErrors.interior ? <small className="text-sm text-red-600">{fieldErrors.interior}</small> : null}
          </fieldset>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Service template</h2>
          <div>
            <label className="block text-sm font-medium" htmlFor="templateId">
              Template
            </label>
            <select
              id="templateId"
              name="templateId"
              defaultValue={getValue('templateId', templates[0]?.id ?? '')}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">-- Select template --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {fieldErrors.templateId ? <small className="text-sm text-red-600">{fieldErrors.templateId}</small> : null}
          </div>
        </section>

        <details className="space-y-4 rounded-md border border-slate-200 p-4">
          <summary className="cursor-pointer text-lg font-medium">Pricing controls</summary>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="hourlyWage">
                Hourly wage
              </label>
              <input
                id="hourlyWage"
                name="hourlyWage"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('hourlyWage', preset ? String(preset.hourlyWage) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="burdenPercent">
                Burden percent (decimal)
              </label>
              <input
                id="burdenPercent"
                name="burdenPercent"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('burdenPercent', preset ? String(preset.burdenPercent) : '0.28')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="travelFixedMinutes">
                Travel fixed minutes
              </label>
              <input
                id="travelFixedMinutes"
                name="travelFixedMinutes"
                type="number"
                step="1"
                required
                defaultValue={getValue('travelFixedMinutes', preset ? String(preset.travelFixedMinutes) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="travelMinutesPerMile">
                Travel minutes per mile
              </label>
              <input
                id="travelMinutesPerMile"
                name="travelMinutesPerMile"
                type="number"
                step="0.1"
                required
                defaultValue={getValue('travelMinutesPerMile', preset ? String(preset.travelMinutesPerMile) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="travelMiles">
                Travel miles
              </label>
              <input
                id="travelMiles"
                name="travelMiles"
                type="number"
                step="0.1"
                required
                defaultValue={getValue('travelMiles', '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="mode">
                Pricing mode
              </label>
              <select
                id="mode"
                name="mode"
                defaultValue={getValue('mode', preset ? preset.pricingMode : 'margin')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="margin">Margin</option>
                <option value="markup">Markup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="marginOrMarkup">
                Margin or markup (decimal)
              </label>
              <input
                id="marginOrMarkup"
                name="marginOrMarkup"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('marginOrMarkup', preset ? String(preset.marginOrMarkup) : '0.4')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="fees">
                Fees
              </label>
              <input
                id="fees"
                name="fees"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('fees', preset ? String(preset.fees) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="discounts">
                Discounts
              </label>
              <input
                id="discounts"
                name="discounts"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('discounts', preset ? String(preset.discounts) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="taxRate">
                Tax rate (decimal)
              </label>
              <input
                id="taxRate"
                name="taxRate"
                type="number"
                step="0.0001"
                required
                defaultValue={getValue('taxRate', preset ? String(preset.taxRate) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="roundingRule">
                Rounding rule
              </label>
              <select
                id="roundingRule"
                name="roundingRule"
                defaultValue={getValue('roundingRule', preset ? preset.roundingRule : 'nearest_1')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="nearest_1">Nearest dollar</option>
                <option value="nearest_5">Nearest 5</option>
                <option value="psychological_9">Psychological 9</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="minimum">
                Minimum price
              </label>
              <input
                id="minimum"
                name="minimum"
                type="number"
                step="0.01"
                required
                defaultValue={getValue('minimum', preset ? String(preset.minimum) : '0')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          {presets.length > 1 ? (
            <div>
              <label className="block text-sm font-medium" htmlFor="pricingPresetId">
                Pricing preset
              </label>
              <select
                id="pricingPresetId"
                name="pricingPresetId"
                defaultValue={getValue('pricingPresetId', '')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="">-- Optional preset --</option>
                {presets.map((presetOption) => (
                  <option key={presetOption.id} value={presetOption.id}>
                    {presetOption.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </details>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-6 py-2 text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            Save quote
          </button>
        </div>
      </form>
    </main>
  );
}
