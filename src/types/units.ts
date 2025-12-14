/**
 * Branded Types for Anthropometric Measurements
 * 
 * These types help prevent unit confusion in calculations.
 * Using TypeScript's structural typing with a phantom brand.
 */

// Brand symbol for type uniqueness
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ============================================================================
// BRANDED TYPES
// ============================================================================

/** Millimeters - used for skinfold measurements */
export type Millimeters = Brand<number, 'mm'>;

/** Centimeters - used for height, girths, breadths */
export type Centimeters = Brand<number, 'cm'>;

/** Kilograms - used for weight and mass */
export type Kilograms = Brand<number, 'kg'>;

/** Percentage - used for body fat, muscle mass percentage */
export type Percentage = Brand<number, 'percent'>;

/** Years - used for age */
export type Years = Brand<number, 'years'>;

// ============================================================================
// CONSTRUCTORS WITH VALIDATION
// ============================================================================

/**
 * Create a Millimeters value with validation
 * Valid range: 0-100mm (typical skinfold range)
 */
export function mm(value: number): Millimeters {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid mm value: ${value}`);
    }
    // Clamp to valid range instead of throwing
    const clamped = Math.max(0, Math.min(value, 100));
    return clamped as Millimeters;
}

/**
 * Create a Centimeters value with validation
 * Valid range: 0-300cm
 */
export function cm(value: number): Centimeters {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid cm value: ${value}`);
    }
    const clamped = Math.max(0, Math.min(value, 300));
    return clamped as Centimeters;
}

/**
 * Create a Kilograms value with validation
 * Valid range: 0-500kg
 */
export function kg(value: number): Kilograms {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid kg value: ${value}`);
    }
    const clamped = Math.max(0, Math.min(value, 500));
    return clamped as Kilograms;
}

/**
 * Create a Percentage value with validation
 * Valid range: 0-100%
 */
export function percent(value: number): Percentage {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid percent value: ${value}`);
    }
    const clamped = Math.max(0, Math.min(value, 100));
    return clamped as Percentage;
}

/**
 * Create a Years value with validation
 * Valid range: 0-150 years
 */
export function years(value: number): Years {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid years value: ${value}`);
    }
    const clamped = Math.max(0, Math.min(Math.floor(value), 150));
    return clamped as Years;
}

// ============================================================================
// UNSAFE CONSTRUCTORS (for when you know the value is valid)
// ============================================================================

/**
 * Create branded types without validation (use sparingly)
 */
export const unsafeMm = (value: number): Millimeters => value as Millimeters;
export const unsafeCm = (value: number): Centimeters => value as Centimeters;
export const unsafeKg = (value: number): Kilograms => value as Kilograms;
export const unsafePercent = (value: number): Percentage => value as Percentage;
export const unsafeYears = (value: number): Years => value as Years;

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert millimeters to centimeters
 */
export function mmToCm(value: Millimeters): Centimeters {
    return (value / 10) as Centimeters;
}

/**
 * Convert centimeters to millimeters
 */
export function cmToMm(value: Centimeters): Millimeters {
    return (value * 10) as Millimeters;
}

/**
 * Convert centimeters to meters (returns plain number)
 */
export function cmToM(value: Centimeters): number {
    return value / 100;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a number is within valid skinfold range (0-100mm)
 */
export function isValidSkinfold(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100;
}

/**
 * Check if a number is within valid height range (50-250cm)
 */
export function isValidHeight(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= 50 && value <= 250;
}

/**
 * Check if a number is within valid weight range (20-500kg)
 */
export function isValidWeight(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= 20 && value <= 500;
}

/**
 * Check if a number is within valid body fat range (3-60%)
 */
export function isValidBodyFat(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= 3 && value <= 60;
}

// ============================================================================
// TYPED INTERFACES FOR ANTHROPOMETRY
// ============================================================================

export interface TypedSkinfolds {
    triceps: Millimeters;
    biceps: Millimeters;
    subscapular: Millimeters;
    iliac_crest: Millimeters;
    supraspinale: Millimeters;
    abdominal: Millimeters;
    thigh: Millimeters;
    calf: Millimeters;
}

export interface TypedGirths {
    brazoRelajado: Centimeters;
    brazoFlexionado: Centimeters;
    cintura: Centimeters;
    cadera: Centimeters;
    muslo: Centimeters;
    pantorrilla: Centimeters;
}

export interface TypedBreadths {
    humero: Centimeters;
    femur: Centimeters;
    biacromial: Centimeters;
    biiliocristal: Centimeters;
}

export interface TypedAnthropometryInput {
    weight: Kilograms;
    height: Centimeters;
    age: Years;
    skinfolds: Partial<TypedSkinfolds>;
    girths: Partial<TypedGirths>;
    breadths: Partial<TypedBreadths>;
}
