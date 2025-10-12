import { describe, expect, it } from 'vitest';
import { parseChemicalsCsv, stringifyChemicals } from '@/lib/csv';

describe('csv helpers', () => {
  it('parses numeric and optional fields', () => {
    const csv = [
      'name,packageSize,packageUnit,packageCost,wastePercent,vendorSku,concentration',
      ' Bifenthrin ,1,gallon,90,0.05,S-123,7.9',
      ' Second ,2,quart,25,not-a-number,,',
    ].join('\n');

    const [row, second] = parseChemicalsCsv(csv);
    expect(row).toEqual({
      name: 'Bifenthrin',
      packageSize: 1,
      packageUnit: 'gallon',
      packageCost: 90,
      wastePercent: 0.05,
      vendorSku: 'S-123',
      concentration: 7.9,
    });
    expect(second).toEqual({
      name: 'Second',
      packageSize: 2,
      packageUnit: 'quart',
      packageCost: 25,
      wastePercent: 0,
      vendorSku: undefined,
      concentration: undefined,
    });
  });

  it('stringifies rows with headers', () => {
    const output = stringifyChemicals([
      { name: 'Alpha', packageSize: 1, packageUnit: 'gal', packageCost: 10, wastePercent: 0 },
    ]);

    expect(output).toContain('name,packageSize,packageUnit,packageCost,wastePercent');
    expect(output).toContain('Alpha');
  });
});
