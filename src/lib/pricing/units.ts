export type AreaUnit = 'ft2' | 'm2';
export type VolumeUnit = 'gallon' | 'liter';
export type MainUnit = 'ft2' | 'm2' | 'linear_ft' | 'each';

const FT2_TO_M2 = 0.092903;
const GALLON_TO_LITER = 3.78541;

/** Converts square footage to square meters. */
export function toSquareMeters(value: number, unit: AreaUnit): number {
  return unit === 'ft2' ? value * FT2_TO_M2 : value;
}

/** Converts square meters to square feet. */
export function toSquareFeet(value: number, unit: AreaUnit): number {
  return unit === 'm2' ? value / FT2_TO_M2 : value;
}

/** Converts gallons to liters. */
export function toLiters(value: number, unit: VolumeUnit): number {
  return unit === 'gallon' ? value * GALLON_TO_LITER : value;
}

/** Converts liters to gallons. */
export function toGallons(value: number, unit: VolumeUnit): number {
  return unit === 'liter' ? value / GALLON_TO_LITER : value;
}

export function linearFeetToMeters(value: number) {
  return value * 0.3048;
}

export function formatCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/**
 * Normalizes the template's main unit into the base unit used for pricing math (ft² or raw counts).
 * @param value Raw quantity from the UI.
 * @param mainUnit Template main unit selection.
 * @param orgAreaUnit Organization default area unit (ft² or m²).
 * @returns Normalized quantity and unit label.
 * @example
 * const base = normalizeMainQuantity(120, 'm2', 'ft2');
 */
export function normalizeMainQuantity(value: number, mainUnit: MainUnit, orgAreaUnit: AreaUnit) {
  if (mainUnit === 'each') {
    return { quantity: value, unit: 'each' as const };
  }
  if (mainUnit === 'linear_ft') {
    return { quantity: value, unit: 'linear_ft' as const };
  }
  if (mainUnit === 'm2') {
    return { quantity: value / FT2_TO_M2, unit: 'ft2' as const };
  }
  if (orgAreaUnit === 'm2') {
    return { quantity: value / FT2_TO_M2, unit: 'ft2' as const };
  }
  return { quantity: value, unit: 'ft2' as const };
}
