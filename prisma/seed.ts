import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const organization = await prisma.organization.upsert({
    where: { subdomain: 'sample' },
    update: {},
    create: {
      name: 'Sample Pest Control',
      subdomain: 'sample',
    },
  });

  const user = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'admin@example.com' } },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: Role.Owner,
      name: 'Jordan Carter',
      organizationId: organization.id,
    },
  });

  await prisma.companySettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      currency: 'USD',
      taxRate: 0.0825,
      unitsArea: 'ft2',
      unitsVolume: 'gallon',
      roundingRule: 'nearest_5',
      pricingMode: 'margin',
      targetMargin: 0.45,
      defaultMarkup: 0.3,
      hourlyWage: 22,
      burdenPercent: 0.28,
      crewSize: 1,
      travelFixedMin: 15,
      travelMinsPerMile: 1.5,
      minJobPrice: 95,
      quoteExpiryDays: 30,
      termsText: 'Payment due upon completion.',
      brandPrimaryFrom: '#3b82f6',
      brandPrimaryTo: '#10b981',
      brandAccent: '#0ea5e9',
      address: '123 Main St, Austin, TX',
      phone: '512-555-0101',
    },
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      type: 'person',
      name: 'Jordan Residence',
      email: 'jordan@example.com',
      phone: '512-555-0167',
    },
  });

  const property = await prisma.property.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      propertyType: 'Residential',
      address: '123 Main St, Austin, TX',
      area: 2200,
      notes: 'Two-story home with mild infestation',
    },
  });

  const bifenthrin = await prisma.chemical.create({
    data: {
      organizationId: organization.id,
      name: 'Bifenthrin 7.9%',
      packageSize: 1,
      packageUnit: 'gallon',
      packageCost: 85,
      wastePercent: 0.05,
    },
  });

  const deltamethrin = await prisma.chemical.create({
    data: {
      organizationId: organization.id,
      name: 'Deltamethrin WP',
      packageSize: 1,
      packageUnit: 'lb',
      packageCost: 62,
      wastePercent: 0.05,
    },
  });

  const generalPest = await prisma.serviceTemplate.create({
    data: {
      organizationId: organization.id,
      name: 'General Pest (Interior/Exterior)',
      mainUnit: 'ft2',
      setupTimeHrs: 0.5,
      timePer1000Hrs: 0.35,
      minPrice: 95,
      defaultInfestationMultiplier: 1,
      defaultComplexityMultiplier: 1,
      residentialMultiplier: 1,
      commercialMultiplier: 1.15,
    },
  });

  await prisma.serviceRecipeItem.createMany({
    data: [
      {
        organizationId: organization.id,
        serviceTemplateId: generalPest.id,
        chemicalId: bifenthrin.id,
        useFor: 'both',
        usageRatePer1000: 3.2,
      },
      {
        organizationId: organization.id,
        serviceTemplateId: generalPest.id,
        chemicalId: deltamethrin.id,
        useFor: 'interior',
        usageRatePer1000: 1.1,
      },
    ],
  });

  await prisma.tierRule.createMany({
    data: [
      {
        organizationId: organization.id,
        serviceTemplateId: generalPest.id,
        propertyType: 'Residential',
        fromArea: 0,
        toArea: 1500,
      },
      {
        organizationId: organization.id,
        serviceTemplateId: generalPest.id,
        propertyType: 'Residential',
        fromArea: 1501,
        toArea: 2500,
        priceFloor: 125,
      },
      {
        organizationId: organization.id,
        serviceTemplateId: generalPest.id,
        propertyType: 'Residential',
        fromArea: 2501,
        toArea: 4000,
        priceFloor: 165,
      },
    ],
  });

  const termite = await prisma.serviceTemplate.create({
    data: {
      organizationId: organization.id,
      name: 'Termite Perimeter',
      mainUnit: 'linear_ft',
      setupTimeHrs: 0.75,
      timePer1000Hrs: 0.45,
      minPrice: 175,
      defaultInfestationMultiplier: 1,
      defaultComplexityMultiplier: 1.1,
      residentialMultiplier: 1,
      commercialMultiplier: 1.2,
    },
  });

  await prisma.serviceRecipeItem.create({
    data: {
      organizationId: organization.id,
      serviceTemplateId: termite.id,
      chemicalId: bifenthrin.id,
      useFor: 'exterior',
      usageRatePer1000: 4.5,
    },
  });

  await prisma.quote.create({
    data: {
      organizationId: organization.id,
      quoteNumber: 'Q-2024-0001',
      propertyId: property.id,
      serviceTemplateId: generalPest.id,
      status: 'Draft',
      subtotal: 320,
      tax: 26.4,
      total: 346.4,
      pricingModeSnapshot: 'margin',
      marginOrMarkupValue: 0.45,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  console.log(`Seeded organization ${organization.name} with owner ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
