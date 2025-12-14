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
    const age = new Date().getFullYear() - new Date(paciente.datosPersonales.fechaNacimiento).getFullYear();
    const weight = paciente.datosPersonales.peso || 'N/A';

    // Calculate weekly averages for the dashboard
    const avgCalories = weeklyPlan.reduce((acc, day) => acc + day.stats.calories, 0) / weeklyPlan.length;
    const avgProtein = weeklyPlan.reduce((acc, day) => acc + day.stats.macros.protein, 0) / weeklyPlan.length;
    const avgCarbs = weeklyPlan.reduce((acc, day) => acc + day.stats.macros.carbs, 0) / weeklyPlan.length;
    const avgFat = weeklyPlan.reduce((acc, day) => acc + day.stats.macros.fat, 0) / weeklyPlan.length;

    // Micros check (using first day or avg)
    // Let's use average of the week to see if the plan is balanced
    const avgMicros = {
        hierro: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.hierro, 0) / weeklyPlan.length,
        zinc: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.zinc, 0) / weeklyPlan.length,
        calcio: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.calcio, 0) / weeklyPlan.length,
        vitaminaC: weeklyPlan.reduce((acc, day) => acc + day.stats.micros.vitaminaC, 0) / weeklyPlan.length,
    };

    const MicroRow = ({ label, value, target, unit }: { label: string, value: number, target: number, unit: string }) => {
        const isOk = value >= target * 0.8; // 80% threshold
        return (
            <View style={styles.microRow}>
                <Text style={styles.cellText}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.cellText, { color: isOk ? 'green' : 'red', marginRight: 5 }]}>
                        {Math.round(value)} / {target} {unit}
                    </Text>
                    <Text style={{ fontSize: 10, color: isOk ? 'green' : 'red' }}>
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
                        {/* Logo Placeholder */}
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoText}>LOGO</Text>
                        </View>
                        <Text style={styles.title}>Plan Nutricional</Text>
                        <Text style={styles.subtitle}>Personalizado para ti</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.headerLabel}>PACIENTE</Text>
                        <Text style={styles.headerValue}>{fullName}</Text>
                        <Text style={styles.headerLabel}>EDAD / PESO</Text>
                        <Text style={styles.headerValue}>{age} años / {weight} kg</Text>
                        <Text style={styles.headerLabel}>FECHA INICIO</Text>
                        <Text style={styles.headerValue}>{startDate}</Text>
                    </View>
                </View>

                {/* DASHBOARD SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumen Nutricional Promedio</Text>

                    <View style={styles.dashboardContainer}>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Calorías</Text>
                            <Text style={styles.macroValue}>{Math.round(avgCalories)}</Text>
                            <Text style={{ fontSize: 8, color: '#888' }}>Meta: {goals.calories}</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, (avgCalories / goals.calories) * 100)}%` }]} />
                            </View>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Proteína</Text>
                            <Text style={styles.macroValue}>{Math.round(avgProtein)}g</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#2196F3' }]} />
                            </View>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroTitle}>Carbos</Text>
                            <Text style={styles.macroValue}>{Math.round(avgCarbs)}g</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#FF9800' }]} />
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 10, marginTop: 10, borderBottomWidth: 0 }]}>Micronutrientes Clave (Promedio Diario)</Text>
                    <View style={styles.microTable}>
                        <MicroRow label="Hierro (Anemia)" value={avgMicros.hierro} target={DEFAULT_MICRO_GOALS.hierro} unit="mg" />
                        <MicroRow label="Zinc (Defensas)" value={avgMicros.zinc} target={DEFAULT_MICRO_GOALS.zinc} unit="mg" />
                        <MicroRow label="Calcio (Huesos)" value={avgMicros.calcio} target={DEFAULT_MICRO_GOALS.calcio} unit="mg" />
                        <MicroRow label="Vitamina C" value={avgMicros.vitaminaC} target={DEFAULT_MICRO_GOALS.vitaminaC} unit="mg" />
                    </View>
                </View>

                {/* WEEKLY PLAN SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tu Plan Semanal</Text>

                    {weeklyPlan.map((day, index) => (
                        <View key={index} style={styles.dayContainer} wrap={false}>
                            <Text style={styles.dayTitle}>{day.day}</Text>

                            <View style={styles.table}>
                                {/* Table Header */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.cellTextBold, styles.colMeal]}>Comida</Text>
                                    <Text style={[styles.cellTextBold, styles.colDish]}>Plato</Text>
                                    <Text style={[styles.cellTextBold, styles.colIngredients]}>Ingredientes Clave</Text>
                                    <Text style={[styles.cellTextBold, styles.colCalories]}>Kcal</Text>
                                </View>

                                {/* Rows */}
                                {day.meals.map((meal, mIndex) => {
                                    const mealCals = meal.items.reduce((sum, item) => sum + (item.food.energia * item.quantity / 100), 0);
                                    return (
                                        <View key={mIndex} style={styles.tableRow}>
                                            <Text style={[styles.cellTextBold, styles.colMeal]}>{meal.name.split(' - ')[0]}</Text>
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
                    Este plan nutricional es referencial y ha sido generado automáticamente. Consulte con su nutricionista para ajustes específicos.
                </Text>
                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number, totalPages: number }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};
