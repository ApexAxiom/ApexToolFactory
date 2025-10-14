import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const orgName = 'Apex Pest Control';
  let org = await prisma.organization.findFirst({ where: { name: orgName } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: orgName },
    });
  }

  const adminEmail = 'admin@example.com';
  const passwordHash = await bcrypt.hash('ChangeMe!2025', 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { orgId: org.id },
    create: {
      email: adminEmail,
      passwordHash,
      orgId: org.id,
    },
  });

  const preset = await prisma.pricingPreset.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Standard Margin' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Standard Margin',
      pricingMode: 'margin',
      marginOrMarkup: 0.45,
      hourlyWage: 22,
      burdenPercent: 0.28,
      travelFixedMinutes: 15,
      travelMinutesPerMile: 1.5,
      fees: 0,
      discounts: 0,
      taxRate: 0.0825,
      roundingRule: 'nearest_5',
      minimum: 95,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Jordan Carter' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Jordan Carter',
      email: 'jordan@example.com',
      phone: '512-555-0101',
    },
  });

  const property = await prisma.property.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Jordan Residence' } },
    update: { customerId: customer.id, propertyType: 'Residential', area: 2400 },
    create: {
      orgId: org.id,
      name: 'Jordan Residence',
      customerId: customer.id,
      propertyType: 'Residential',
      area: 2400,
    },
  });

  const chemical = await prisma.chemical.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Bifenthrin 7.9%' } },
    update: { packageSize: 1, packageUnit: 'gal', packageCost: 85, wastePercent: 0.05 },
    create: {
      orgId: org.id,
      name: 'Bifenthrin 7.9%',
      packageSize: 1,
      packageUnit: 'gal',
      packageCost: 85,
      wastePercent: 0.05,
    },
  });

  const template = await prisma.serviceTemplate.upsert({
    where: { orgId_name: { orgId: org.id, name: 'General Pest Service' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'General Pest Service',
      mainUnit: 'ft2',
      setupTimeHrs: 0.5,
      timePer1000Hrs: 0.35,
      minPrice: 95,
      defaultInfestationMultiplier: 1,
      defaultComplexityMultiplier: 1,
      residentialMultiplier: 1,
      commercialMultiplier: 1.15,
      tierRules: '[]',
    },
  });

  await prisma.serviceTemplateChemical.upsert({
    where: {
      templateId_chemicalId_useFor: {
        templateId: template.id,
        chemicalId: chemical.id,
        useFor: 'both',
      },
    },
    update: { usageRatePer1000: 3.2 },
    create: {
      orgId: org.id,
      templateId: template.id,
      chemicalId: chemical.id,
      useFor: 'both',
      usageRatePer1000: 3.2,
    },
  });

  await prisma.quoteSequence.upsert({
    where: { orgId: org.id },
    update: {},
    create: { orgId: org.id, next: 1 },
  });

  console.log('Seeded admin user. Login with admin@example.com / ChangeMe!2025');
  console.log('Default preset:', preset.name);
  console.log('Customer/property/template ready for quick quoting.');
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
