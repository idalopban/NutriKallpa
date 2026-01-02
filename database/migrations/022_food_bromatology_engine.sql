-- ============================================================================
-- MIGRATION 022: Food Bromatology Engine
-- 
-- Creates infrastructure for:
-- - Cooking conversion factors (raw → cooked weights)
-- - Household measures (cups, tablespoons, portions)
-- - Links to TPCA (Peruvian Food Composition Table)
-- ============================================================================
-- ============================================================================
-- 1. COOKING CONVERSION FACTORS TABLE
-- Stores expansion/contraction factors for different cooking methods
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.factores_conversion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to the food item (if using external alimentos table)
    -- For now, we use codigo_tpca as a flexible reference
    codigo_tpca VARCHAR(20) NOT NULL,
    alimento_nombre VARCHAR(255) NOT NULL,
    -- Denormalized for quick lookups
    -- Conversion type
    tipo TEXT NOT NULL CHECK (
        tipo IN ('cooking_expansion', 'cooking_contraction')
    ),
    -- Cooking method
    metodo_coccion TEXT NOT NULL CHECK (
        metodo_coccion IN (
            'boiled',
            'grilled',
            'fried',
            'steamed',
            'baked',
            'roasted',
            'raw',
            'microwave'
        )
    ),
    -- The conversion factor (e.g., 2.8 = 280% of original weight for rice)
    factor_peso DECIMAL(5, 3) NOT NULL CHECK (
        factor_peso > 0
        AND factor_peso <= 10
    ),
    -- Documentation
    notas TEXT,
    fuente TEXT DEFAULT 'CENAN/TAFERA 2017',
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint per food + method
    UNIQUE(codigo_tpca, metodo_coccion)
);
-- Add comments
COMMENT ON TABLE public.factores_conversion IS 'Cooking conversion factors from TAFERA/CENAN for raw→cooked weight calculations';
COMMENT ON COLUMN public.factores_conversion.factor_peso IS 'Multiplier for weight after cooking. >1 = expansion (rice), <1 = contraction (meat)';
-- ============================================================================
-- 2. HOUSEHOLD MEASURES TABLE (TAFERA)
-- Stores cups, tablespoons, portions in grams
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medidas_caseras_tafera (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to the food item
    codigo_tpca VARCHAR(20) NOT NULL,
    alimento_nombre VARCHAR(255) NOT NULL,
    -- Measure details
    medida_nombre TEXT NOT NULL,
    -- taza, cucharada, unidad, porcion, vaso, plato
    gramos_equivalentes DECIMAL(8, 2) NOT NULL CHECK (gramos_equivalentes > 0),
    -- State of the food when measured
    estado TEXT NOT NULL CHECK (
        estado IN ('crudo', 'cocido', 'preparado', 'listo')
    ),
    -- Full description for patient-facing output
    descripcion TEXT,
    -- "1 taza colmada de arroz blanco cocido"
    -- Metadata
    es_estandar BOOLEAN DEFAULT TRUE,
    -- true = official TAFERA measure
    categoria_alimento TEXT,
    -- cereales, carnes, lacteos, etc.
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add comments
COMMENT ON TABLE public.medidas_caseras_tafera IS 'Household measures from TAFERA for patient-friendly portion descriptions';
COMMENT ON COLUMN public.medidas_caseras_tafera.gramos_equivalentes IS 'Weight in grams for the specified measure in the specified state';
-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_factores_codigo ON public.factores_conversion(codigo_tpca);
CREATE INDEX IF NOT EXISTS idx_factores_metodo ON public.factores_conversion(metodo_coccion);
CREATE INDEX IF NOT EXISTS idx_medidas_codigo ON public.medidas_caseras_tafera(codigo_tpca);
CREATE INDEX IF NOT EXISTS idx_medidas_estado ON public.medidas_caseras_tafera(estado);
CREATE INDEX IF NOT EXISTS idx_medidas_categoria ON public.medidas_caseras_tafera(categoria_alimento);
-- ============================================================================
-- 4. SEED DATA - Common Peruvian Foods
-- ============================================================================
-- Cooking Factors (Expansion/Contraction)
INSERT INTO public.factores_conversion (
        codigo_tpca,
        alimento_nombre,
        tipo,
        metodo_coccion,
        factor_peso,
        notas
    )
VALUES -- CEREALES (Expansion)
    (
        'A001',
        'Arroz blanco grano largo',
        'cooking_expansion',
        'boiled',
        2.80,
        'Arroz hervido absorbe agua 2.8x'
    ),
    (
        'A002',
        'Arroz integral',
        'cooking_expansion',
        'boiled',
        2.50,
        'Arroz integral menor absorción'
    ),
    (
        'A010',
        'Avena en hojuelas',
        'cooking_expansion',
        'boiled',
        4.00,
        'Avena cocida como porridge'
    ),
    (
        'A011',
        'Quinua',
        'cooking_expansion',
        'boiled',
        2.70,
        'Quinua hervida'
    ),
    (
        'A020',
        'Fideo spaghetti',
        'cooking_expansion',
        'boiled',
        2.25,
        'Pasta al dente'
    ),
    (
        'A021',
        'Fideo tallarín',
        'cooking_expansion',
        'boiled',
        2.20,
        'Tallarín hervido'
    ),
    -- MENESTRAS (Expansion)
    (
        'B001',
        'Lentejas',
        'cooking_expansion',
        'boiled',
        2.50,
        'Lentejas hervidas'
    ),
    (
        'B002',
        'Frejol canario',
        'cooking_expansion',
        'boiled',
        2.30,
        'Frejoles hervidos'
    ),
    (
        'B003',
        'Garbanzo',
        'cooking_expansion',
        'boiled',
        2.20,
        'Garbanzos hervidos'
    ),
    (
        'B004',
        'Pallares',
        'cooking_expansion',
        'boiled',
        2.40,
        'Pallares hervidos'
    ),
    -- TUBÉRCULOS (Minimal change)
    (
        'C001',
        'Papa blanca',
        'cooking_expansion',
        'boiled',
        1.05,
        'Papa sancochada con cáscara'
    ),
    (
        'C002',
        'Papa amarilla',
        'cooking_expansion',
        'boiled',
        1.03,
        'Papa amarilla sancochada'
    ),
    (
        'C003',
        'Camote',
        'cooking_expansion',
        'boiled',
        1.08,
        'Camote sancochado'
    ),
    (
        'C004',
        'Yuca',
        'cooking_expansion',
        'boiled',
        1.10,
        'Yuca sancochada'
    ),
    -- CARNES (Contraction)
    (
        'D001',
        'Pollo pechuga',
        'cooking_contraction',
        'grilled',
        0.75,
        'Pérdida de agua al grillar'
    ),
    (
        'D002',
        'Pollo pechuga',
        'cooking_contraction',
        'boiled',
        0.85,
        'Menor pérdida al hervir'
    ),
    (
        'D003',
        'Carne res bistec',
        'cooking_contraction',
        'grilled',
        0.70,
        'Carne a la plancha'
    ),
    (
        'D004',
        'Carne res bistec',
        'cooking_contraction',
        'roasted',
        0.72,
        'Carne al horno'
    ),
    (
        'D010',
        'Pescado bonito',
        'cooking_contraction',
        'grilled',
        0.80,
        'Pescado a la plancha'
    ),
    (
        'D011',
        'Pescado bonito',
        'cooking_contraction',
        'steamed',
        0.88,
        'Pescado al vapor'
    ),
    -- HUEVOS
    (
        'E001',
        'Huevo de gallina',
        'cooking_contraction',
        'boiled',
        0.98,
        'Huevo duro pierde mínimo'
    ),
    (
        'E002',
        'Huevo de gallina',
        'cooking_contraction',
        'fried',
        0.90,
        'Huevo frito pierde agua'
    ) ON CONFLICT (codigo_tpca, metodo_coccion) DO
UPDATE
SET factor_peso = EXCLUDED.factor_peso,
    notas = EXCLUDED.notas,
    updated_at = NOW();
-- Household Measures (TAFERA)
INSERT INTO public.medidas_caseras_tafera (
        codigo_tpca,
        alimento_nombre,
        medida_nombre,
        gramos_equivalentes,
        estado,
        descripcion,
        categoria_alimento
    )
VALUES -- ARROZ
    (
        'A001',
        'Arroz blanco',
        'taza',
        140,
        'cocido',
        '1 taza de arroz blanco cocido, colmada',
        'cereales'
    ),
    (
        'A001',
        'Arroz blanco',
        'cucharada',
        15,
        'cocido',
        '1 cucharada sopera de arroz cocido',
        'cereales'
    ),
    (
        'A001',
        'Arroz blanco',
        'porcion',
        180,
        'cocido',
        '1 porción estándar de arroz cocido',
        'cereales'
    ),
    (
        'A001',
        'Arroz blanco',
        'taza',
        50,
        'crudo',
        '1 taza de arroz crudo',
        'cereales'
    ),
    -- QUINUA
    (
        'A011',
        'Quinua',
        'taza',
        130,
        'cocido',
        '1 taza de quinua cocida',
        'cereales'
    ),
    (
        'A011',
        'Quinua',
        'porcion',
        150,
        'cocido',
        '1 porción estándar de quinua',
        'cereales'
    ),
    -- AVENA
    (
        'A010',
        'Avena en hojuelas',
        'taza',
        200,
        'cocido',
        '1 taza de avena cocida (porridge)',
        'cereales'
    ),
    (
        'A010',
        'Avena en hojuelas',
        'cucharada',
        10,
        'crudo',
        '1 cucharada de avena seca',
        'cereales'
    ),
    -- PAPA
    (
        'C001',
        'Papa blanca',
        'unidad',
        150,
        'cocido',
        '1 papa mediana sancochada',
        'tuberculos'
    ),
    (
        'C001',
        'Papa blanca',
        'porcion',
        200,
        'cocido',
        '1 porción de papa (2 unidades pequeñas)',
        'tuberculos'
    ),
    -- CAMOTE
    (
        'C003',
        'Camote',
        'unidad',
        130,
        'cocido',
        '1 camote mediano sancochado',
        'tuberculos'
    ),
    (
        'C003',
        'Camote',
        'rodaja',
        40,
        'cocido',
        '1 rodaja gruesa de camote',
        'tuberculos'
    ),
    -- POLLO
    (
        'D001',
        'Pollo pechuga',
        'filete',
        150,
        'cocido',
        '1 filete de pechuga cocido',
        'carnes'
    ),
    (
        'D001',
        'Pollo pechuga',
        'porcion',
        100,
        'cocido',
        '1 porción estándar de pollo',
        'carnes'
    ),
    -- CARNE RES
    (
        'D003',
        'Carne res bistec',
        'filete',
        120,
        'cocido',
        '1 bistec mediano cocido',
        'carnes'
    ),
    (
        'D003',
        'Carne res bistec',
        'porcion',
        100,
        'cocido',
        '1 porción estándar de carne',
        'carnes'
    ),
    -- PESCADO
    (
        'D010',
        'Pescado bonito',
        'filete',
        150,
        'cocido',
        '1 filete de pescado cocido',
        'pescados'
    ),
    (
        'D010',
        'Pescado bonito',
        'porcion',
        120,
        'cocido',
        '1 porción estándar de pescado',
        'pescados'
    ),
    -- HUEVO
    (
        'E001',
        'Huevo de gallina',
        'unidad',
        50,
        'cocido',
        '1 huevo duro',
        'huevos'
    ),
    (
        'E001',
        'Huevo de gallina',
        'unidad',
        60,
        'crudo',
        '1 huevo entero crudo',
        'huevos'
    ),
    -- LECHE
    (
        'F001',
        'Leche evaporada',
        'taza',
        240,
        'listo',
        '1 taza de leche',
        'lacteos'
    ),
    (
        'F001',
        'Leche evaporada',
        'vaso',
        200,
        'listo',
        '1 vaso de leche',
        'lacteos'
    ),
    -- VERDURAS
    (
        'G001',
        'Lechuga',
        'taza',
        50,
        'crudo',
        '1 taza de lechuga picada',
        'verduras'
    ),
    (
        'G002',
        'Tomate',
        'unidad',
        120,
        'crudo',
        '1 tomate mediano',
        'verduras'
    ),
    (
        'G003',
        'Zanahoria',
        'unidad',
        80,
        'crudo',
        '1 zanahoria mediana',
        'verduras'
    ),
    (
        'G003',
        'Zanahoria',
        'taza',
        130,
        'cocido',
        '1 taza de zanahoria en cubitos cocida',
        'verduras'
    ),
    -- FRUTAS
    (
        'H001',
        'Plátano de seda',
        'unidad',
        120,
        'crudo',
        '1 plátano mediano',
        'frutas'
    ),
    (
        'H002',
        'Manzana',
        'unidad',
        180,
        'crudo',
        '1 manzana mediana',
        'frutas'
    ),
    (
        'H003',
        'Naranja',
        'unidad',
        200,
        'crudo',
        '1 naranja mediana',
        'frutas'
    ),
    (
        'H004',
        'Papaya',
        'taza',
        140,
        'crudo',
        '1 taza de papaya en cubos',
        'frutas'
    ),
    -- MENESTRAS
    (
        'B001',
        'Lentejas',
        'taza',
        180,
        'cocido',
        '1 taza de lentejas cocidas',
        'menestras'
    ),
    (
        'B002',
        'Frejol canario',
        'taza',
        170,
        'cocido',
        '1 taza de frejoles cocidos',
        'menestras'
    ),
    (
        'B003',
        'Garbanzo',
        'taza',
        160,
        'cocido',
        '1 taza de garbanzos cocidos',
        'menestras'
    ) ON CONFLICT DO NOTHING;
-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================
-- These are reference tables, read-only for all authenticated users
ALTER TABLE public.factores_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medidas_caseras_tafera ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read
DROP POLICY IF EXISTS "Authenticated users can read factores_conversion" ON public.factores_conversion;
CREATE POLICY "Authenticated users can read factores_conversion" ON public.factores_conversion FOR
SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can read medidas_caseras" ON public.medidas_caseras_tafera;
CREATE POLICY "Authenticated users can read medidas_caseras" ON public.medidas_caseras_tafera FOR
SELECT TO authenticated USING (true);
-- Only admins can modify (via service role)
GRANT SELECT ON public.factores_conversion TO authenticated;
GRANT SELECT ON public.medidas_caseras_tafera TO authenticated;
-- ============================================================================
-- 6. HELPER FUNCTION: Get Cooked Quantity
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_cooked_quantity(
        p_codigo_tpca VARCHAR(20),
        p_raw_grams DECIMAL,
        p_cooking_method TEXT DEFAULT 'boiled'
    ) RETURNS TABLE (
        cooked_grams DECIMAL,
        factor_used DECIMAL,
        conversion_type TEXT
    ) LANGUAGE plpgsql STABLE AS $$ BEGIN RETURN QUERY
SELECT ROUND(p_raw_grams * fc.factor_peso, 0) as cooked_grams,
    fc.factor_peso as factor_used,
    fc.tipo as conversion_type
FROM public.factores_conversion fc
WHERE fc.codigo_tpca = p_codigo_tpca
    AND fc.metodo_coccion = p_cooking_method
LIMIT 1;
-- If no specific factor found, return 1:1 ratio
IF NOT FOUND THEN RETURN QUERY
SELECT p_raw_grams,
    1.0::DECIMAL,
    'none'::TEXT;
END IF;
END;
$$;
-- ============================================================================
-- 7. HELPER FUNCTION: Get Best Household Measure
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_household_measure(
        p_codigo_tpca VARCHAR(20),
        p_grams DECIMAL,
        p_estado TEXT DEFAULT 'cocido'
    ) RETURNS TABLE (
        medida TEXT,
        descripcion TEXT,
        cantidad DECIMAL
    ) LANGUAGE plpgsql STABLE AS $$
DECLARE v_best_measure RECORD;
v_cantidad DECIMAL;
BEGIN -- Find the best matching measure (closest to 1-2 units)
FOR v_best_measure IN
SELECT m.medida_nombre,
    m.descripcion as desc_full,
    m.gramos_equivalentes
FROM public.medidas_caseras_tafera m
WHERE m.codigo_tpca = p_codigo_tpca
    AND m.estado = p_estado
ORDER BY -- Prefer measures that result in 1-2 units
    ABS(p_grams / m.gramos_equivalentes - 1.5) ASC
LIMIT 1 LOOP v_cantidad := ROUND(
        (p_grams / v_best_measure.gramos_equivalentes) * 4
    ) / 4;
-- Round to 1/4
RETURN QUERY
SELECT v_best_measure.medida_nombre,
    v_best_measure.desc_full,
    v_cantidad;
RETURN;
END LOOP;
-- If no measure found, return grams
RETURN QUERY
SELECT 'gramos'::TEXT,
    (p_grams || 'g')::TEXT,
    p_grams;
END;
$$;