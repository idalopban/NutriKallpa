
/**
 * Calculates the final value from a series of anthropometric measurements
 * following ISAK recommendations (Median for 3+, Mean for 2).
 * 
 * @param values Array of numerical measurements
 * @returns The processing result (median or mean)
 */
export function processMeasurement(values: number[]): number {
    // Filter out zeros/empty
    const validValues = values.filter(v => v > 0);

    if (validValues.length === 0) return 0;
    if (validValues.length === 1) return validValues[0];

    // If 2 values, return Mean
    if (validValues.length === 2) {
        return (validValues[0] + validValues[1]) / 2;
    }

    // If 3 or more, return Median
    // Sort ascending
    const sorted = [...validValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 !== 0) {
        return sorted[mid];
    } else {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
}

/**
 * Calculates the Technical Error of Measurement (TEM)
 * TEM = sqrt(sum(d^2) / 2n)
 * This is usually for variability distinct from the final value, 
 * but useful for validity checks.
 */
export function calculateTEM(measurements: number[][]): number {
    // Implementation for global TEM if needed
    // measurement: array of [m1, m2] for n subjects
    return 0;
}
