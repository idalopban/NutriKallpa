export interface Alimento {
    codigo: string;
    nombre: string;
    energia: number; // kcal
    agua: number; // g
    proteinas: number; // g
    grasa: number; // g
    carbohidratos: number; // g
    fibra: number; // g
    cenizas: number; // g
    calcio: number; // mg
    fosforo: number; // mg
    zinc: number; // mg
    hierro: number; // mg
    betaCaroteno: number; // µg
    vitaminaA: number; // µg
    tiamina: number; // mg (B1)
    riboflavina: number; // mg (B2)
    niacina: number; // mg (B3)
    vitaminaC: number; // mg
    acidoFolico: number; // µg
    sodio: number; // mg
    potasio: number; // mg
}

export async function parseAlimentosCSV(): Promise<Alimento[]> {
    try {
        const response = await fetch('/alimentos.csv');
        const text = await response.text();

        const lines = text.split('\n');
        const alimentos: Alimento[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(';');

            // Basic validation: needs enough columns and first col should not be empty
            // CSV includes indices up to 23 (24 columns). Require at least 24 columns.
            if (parts.length < 24 || !parts[0]) continue;

            // Helper to clean string (remove quotes)
            const clean = (s: string) => s?.replace(/^"|"$/g, '').trim() || '';
            const parseNum = (s: string) => {
                if (!s || s === '-' || s === '') return 0;
                const cleaned = clean(s).replace(',', '.'); // Handle decimal comma
                return parseFloat(cleaned) || 0;
            };

            // Skip lines that don't look like data (e.g. units row)
            // Data rows start with a code like A1, B1, etc.
            if (!/^[A-Z][0-9]+/.test(clean(parts[0]))) continue;

            // Mapping based on CSV structure:
            // 0: CÓDIGO
            // 1: NOMBRE
            // 2: Energía (kcal)
            // 3: Energía (kJ)
            // 4: Agua
            // 5: Proteínas
            // 6: Grasa total
            // 7: Carbohidratos totales
            // 8: Carbohidratos disponibles
            // 9: Fibra dietaria
            // 10: Cenizas
            // 11: Calcio
            // 12: Fósforo
            // 13: Zinc
            // 14: Hierro
            // 15: Beta caroteno
            // 16: Vitamina A
            // 17: Tiamina (B1)
            // 18: Riboflavina (B2)
            // 19: Niacina (B3)
            // 20: Vitamina C
            // 21: Ácido fólico
            // 22: Sodio
            // 23: Potasio

            const alimento: Alimento = {
                codigo: clean(parts[0]),
                nombre: clean(parts[1]),
                energia: parseNum(parts[2]),
                agua: parseNum(parts[4]),
                proteinas: parseNum(parts[5]),
                grasa: parseNum(parts[6]),
                carbohidratos: parseNum(parts[7]), // Using Total Carbs
                fibra: parseNum(parts[9]),
                cenizas: parseNum(parts[10]),
                calcio: parseNum(parts[11]),
                fosforo: parseNum(parts[12]),
                zinc: parseNum(parts[13]),
                hierro: parseNum(parts[14]),
                betaCaroteno: parseNum(parts[15]),
                vitaminaA: parseNum(parts[16]),
                tiamina: parseNum(parts[17]),
                riboflavina: parseNum(parts[18]),
                niacina: parseNum(parts[19]),
                vitaminaC: parseNum(parts[20]),
                acidoFolico: parseNum(parts[21]),
                sodio: parseNum(parts[22]),
                potasio: parseNum(parts[23])
            };

            alimentos.push(alimento);
        }

        return alimentos;
    } catch (error) {
        console.error("Error parsing CSV:", error);
        return [];
    }
}
