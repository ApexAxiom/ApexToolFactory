import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export type ChemicalCsvRow = {
  name: string;
  packageSize: number;
  packageUnit: string;
  packageCost: number;
  wastePercent: number;
  vendorSku?: string;
  concentration?: number;
};

/**
 * Parses a CSV payload into normalized chemical records ready for persistence.
 * @param data Raw CSV string including a header row.
 * @returns Array of structured chemical rows.
 * @example
 * const rows = parseChemicalsCsv('name,packageSize,packageUnit,packageCost,wastePercent\nAlpha,1,gallon,20,0.1');
 */
export function parseChemicalsCsv(data: string): ChemicalCsvRow[] {
  const rows = parse(data, { columns: true, skip_empty_lines: true }) as Array<Record<string, unknown>>;
  return rows.map((row) => {
    const name = String(row.name ?? '').trim();
    const concentrationRaw = row.concentration;
    const hasConcentration =
      concentrationRaw !== undefined &&
      concentrationRaw !== null &&
      String(concentrationRaw).trim().length > 0;

    return {
      name,
      packageSize: toNumber(row.packageSize, 0),
      packageUnit: String(row.packageUnit ?? '').trim(),
      packageCost: toNumber(row.packageCost, 0),
      wastePercent: toNumber(row.wastePercent, 0),
      vendorSku: row.vendorSku ? String(row.vendorSku).trim() : undefined,
      concentration: hasConcentration ? toNumber(concentrationRaw, 0) : undefined,
    };
  });
}

/**
 * Serializes chemical records into a CSV with header row for export/download.
 * @param rows Collection of chemical data objects.
 * @returns CSV string representing the rows.
 * @example
 * const csv = stringifyChemicals([{ name: 'Alpha', packageUnit: 'gallon' }]);
 */
export function stringifyChemicals(rows: Array<Record<string, unknown>>): string {
  return stringify(rows, { header: true });
}

function toNumber(value: unknown, fallback: number): number {
  const candidate = typeof value === 'string' && value.trim().length === 0 ? undefined : value;
  const parsed = Number(candidate ?? fallback);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}
