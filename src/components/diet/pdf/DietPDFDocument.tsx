import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { styles } from './DietPDFStyles';
import { DailyPlan, DailyStats, DEFAULT_MICRO_GOALS } from '@/lib/diet-generator';
import { Paciente } from '@/types';

interface PDFProps {
    paciente: Paciente;
    weeklyPlan: DailyPlan[];
    startDate: string;
    goals: {
        calories: number;
        macros: { protein: number; carbs: number; fat: number };
    };
}

export const DietPDFDocument = ({ paciente, weeklyPlan, startDate, goals }: PDFProps) => {
    const fullName = `${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`;
    const birthDate = paciente.datosPersonales.fechaNacimiento ? new Date(paciente.datosPersonales.fechaNacimiento) : new Date();
    const age = new Date().getFullYear() - birthDate.getFullYear();
    const weight = paciente.datosPersonales.peso || 70;

    // Path to Logo (using public folder URL)
    const logoPath = "/logo.png";

    // Calculate weekly averages for the dashboard
    const avgCalories = weeklyPlan.reduce((acc, day) => acc + day.stats.calories, 0) / weeklyPlan.length;
    const avgProtein = weeklyPlan.reduce((acc, day) => acc + day.stats.macros.protein, 0) / weeklyPlan.length;
    const avgCarbs = weeklyPlan.reduce((acc, day) => acc + day.stats.macros.carbs, 0) / weeklyPlan.length;
    const avgFat = weeklyPlan.reduce((acc, day) => acc + day.stats.macros.fat, 0) / weeklyPlan.length;

    const avgMicros = {
        hierro: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.hierro, 0) / weeklyPlan.length,
        zinc: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.zinc, 0) / weeklyPlan.length,
        calcio: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.calcio, 0) / weeklyPlan.length,
        vitaminaC: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.vitaminaC, 0) / weeklyPlan.length,
        fosforo: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.fosforo, 0) / weeklyPlan.length,
        vitaminaA: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.vitaminaA, 0) / weeklyPlan.length,
        tiamina: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.tiamina, 0) / weeklyPlan.length,
        riboflavina: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.riboflavina, 0) / weeklyPlan.length,
        niacina: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.niacina, 0) / weeklyPlan.length,
        acidoFolico: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.acidoFolico, 0) / weeklyPlan.length,
        sodio: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.sodio, 0) / weeklyPlan.length,
        potasio: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.potasio, 0) / weeklyPlan.length,
    };

    // Hydration calculation (standard 35ml/kg)
    const dailyWaterTarget = (weight * 35) / 1000;

    const MicroRow = ({ label, value, target, unit }: { label: string, value: number, target: number, unit: string }) => {
        const isOk = value >= target * 0.8;
        return (
            <View style={styles.microRow}>
                <Text style={styles.cellText}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.cellText, { color: isOk ? '#166534' : '#991b1b', fontWeight: 'bold' }]}>
                        {Math.round(value)} / {target} {unit}
                    </Text>
                    <Text style={{ fontSize: 10, marginLeft: 5, color: isOk ? '#166534' : '#991b1b' }}>
                        {isOk ? '✓' : '⚠'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* HEADER */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerLeft}>
                        <Image src={logoPath} style={styles.logo} />
                        <Text style={styles.title}>Plan Nutricional</Text>
                        <Text style={styles.subtitle}>Nutrición de Precisión</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.headerLabel}>PACIENTE</Text>
                        <Text style={styles.headerValue}>{fullName}</Text>
                        <Text style={styles.headerLabel}>EDAD / PESO ACT.</Text>
                        <Text style={styles.headerValue}>{age} años / {weight} kg</Text>
                        <Text style={styles.headerLabel}>VIGENCIA</Text>
                        <Text style={styles.headerValue}>Desde {startDate}</Text>
                    </View>
                </View>

                {/* DASHBOARD SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Análisis Nutricional Semanal</Text>

                    <View style={styles.dashboardContainer}>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Calorías</Text>
                            <Text style={styles.macroValue}>{Math.round(avgCalories)}</Text>
                            <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>Meta: {goals.calories}</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, (avgCalories / goals.calories) * 100)}%`, backgroundColor: '#84CC16' }]} />
                            </View>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Proteína</Text>
                            <Text style={styles.macroValue}>{Math.round(avgProtein)}g</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, (avgProtein / goals.macros.protein) * 100)}%`, backgroundColor: '#3b82f6' }]} />
                            </View>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Carbohidratos</Text>
                            <Text style={styles.macroValue}>{Math.round(avgCarbs)}g</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, (avgCarbs / goals.macros.carbs) * 100)}%`, backgroundColor: '#f59e0b' }]} />
                            </View>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Grasas</Text>
                            <Text style={styles.macroValue}>{Math.round(avgFat)}g</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, (avgFat / goals.macros.fat) * 100)}%`, backgroundColor: '#ef4444' }]} />
                            </View>
                        </View>
                    </View>

                    {/* HYDRATION SUB-SECTION */}
                    <View style={{ marginTop: 15, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1E40AF', marginBottom: 2 }}>🎯 OBJETIVO DE HIDRATACIÓN</Text>
                        <Text style={{ fontSize: 12, color: '#1E3A8A' }}>Debes consumir aproximadamente <Text style={{ fontWeight: 'bold' }}>{dailyWaterTarget.toFixed(1)} Litros</Text> de agua al día.</Text>
                        <Text style={{ fontSize: 8, color: '#60A5FA', marginTop: 2 }}>*Incluye agua pura, infusiones y agua de frutas sin azúcar.</Text>
                    </View>

                    {/* MICRO TABLE - EXPANDED */}
                    <View style={styles.microTable}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, color: '#365314' }}>Balance de Micronutrientes (Promedio Diario)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <View style={{ width: '48%' }}>
                                <MicroRow label="Hierro" value={avgMicros.hierro} target={DEFAULT_MICRO_GOALS.hierro} unit="mg" />
                                <MicroRow label="Zinc" value={avgMicros.zinc} target={DEFAULT_MICRO_GOALS.zinc} unit="mg" />
                                <MicroRow label="Calcio" value={avgMicros.calcio} target={DEFAULT_MICRO_GOALS.calcio} unit="mg" />
                                <MicroRow label="Fósforo" value={avgMicros.fosforo} target={DEFAULT_MICRO_GOALS.fosforo} unit="mg" />
                                <MicroRow label="Sodio" value={avgMicros.sodio} target={DEFAULT_MICRO_GOALS.sodio} unit="mg" />
                                <MicroRow label="Potasio" value={avgMicros.potasio} target={DEFAULT_MICRO_GOALS.potasio} unit="mg" />
                            </View>
                            <View style={{ width: '48%' }}>
                                <MicroRow label="Vitamina C" value={avgMicros.vitaminaC} target={DEFAULT_MICRO_GOALS.vitaminaC} unit="mg" />
                                <MicroRow label="Vitamina A" value={avgMicros.vitaminaA} target={DEFAULT_MICRO_GOALS.vitaminaA} unit="ug" />
                                <MicroRow label="Tiamina" value={avgMicros.tiamina} target={DEFAULT_MICRO_GOALS.tiamina} unit="mg" />
                                <MicroRow label="Riboflavina" value={avgMicros.riboflavina} target={DEFAULT_MICRO_GOALS.riboflavina} unit="mg" />
                                <MicroRow label="Niacina" value={avgMicros.niacina} target={DEFAULT_MICRO_GOALS.niacina} unit="mg" />
                                <MicroRow label="Ácido Fólico" value={avgMicros.acidoFolico} target={DEFAULT_MICRO_GOALS.acidoFolico} unit="ug" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* WEEKLY PLAN SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Estructura de Comidas Semanales</Text>

                    {weeklyPlan.map((day, index) => (
                        <View key={index} style={styles.dayContainer} wrap={false}>
                            <Text style={styles.dayTitle}>{day.day} - {Math.round(day.stats.calories)} kcal</Text>

                            <View style={styles.table}>
                                {/* Table Header */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.cellTextBold, styles.colMeal]}>Comida / Check</Text>
                                    <Text style={[styles.cellTextBold, styles.colDish]}>Preparación</Text>
                                    <Text style={[styles.cellTextBold, styles.colIngredients]}>Ingredientes</Text>
                                    <Text style={[styles.cellTextBold, styles.colCalories]}>Kcal</Text>
                                </View>

                                {/* Rows */}
                                {day.meals.map((meal, mIndex) => {
                                    const mealCals = meal.items.reduce((sum, item) => sum + (item.food.energia * item.quantity / 100), 0);
                                    return (
                                        <View key={mIndex} style={styles.tableRow}>
                                            <View style={styles.colMeal}>
                                                <View style={styles.checkbox} />
                                                <Text style={styles.cellTextBold}>{meal.name.split(' - ')[0]}</Text>
                                            </View>
                                            <View style={styles.colDish}>
                                                <Text style={styles.cellTextBold}>{meal.name.split(' - ')[1] || meal.name}</Text>
                                            </View>
                                            <View style={styles.colIngredients}>
                                                {meal.items.map((item, i) => (
                                                    <Text key={i} style={styles.cellTextSmall}>
                                                        • {item.food.nombre} ({Math.round(item.quantity)}g)
                                                    </Text>
                                                ))}
                                            </View>
                                            <Text style={[styles.cellText, styles.colCalories]}>{Math.round(mealCals)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>

                {/* FOOTER */}
                <Text style={styles.footerText} fixed>
                    NutriKallpa®: Guía nutricional personalizada. Los pesos son referenciales (alimento crudo).
                    Marque su cumplimiento diario para mejorar resultados. 2024
                </Text>
                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number, totalPages: number }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};
