export type AreaUnit = 'ft2' | 'm2';
export type VolumeUnit = 'gallon' | 'liter';

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
