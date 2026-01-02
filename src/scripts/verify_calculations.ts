
import { calculateAnthropometry } from "../lib/calculos-nutricionales";
import { MedidasAntropometricas } from "../types";

// Test Data (Standard "Phantom" approximation or normal subject)
const testSubject: MedidasAntropometricas = {
    id: "test-1",
    pacienteId: "p-1",
    fecha: new Date().toISOString(),
    peso: 75.0, // kg
    talla: 175.0, // cm
    edad: 25,
    sexo: "masculino",
    pliegues: {
        triceps: 10,
        subscapular: 12,
        biceps: 5,
        iliac_crest: 15,
        supraspinale: 8,
        abdominal: 18,
        thigh: 10,
        calf: 6,
    },
    perimetros: {
        brazoRelajado: 30,
        brazoFlex: 32,
        cintura: 80,
        cadera: 95,
        musloMedio: 55,
        pantorrilla: 38,
    },
    diametros: {
        humero: 7.0,
        femur: 9.8,
        biacromial: 40,
        biiliocristal: 29,
    },
};

console.log("--- START VERIFICATION ---");
console.log("Test Subject:", {
    weight: testSubject.peso,
    height: testSubject.talla,
    sex: testSubject.sexo,
});

const resultados = calculateAnthropometry(testSubject, "general");

console.log("\n--- CALCULATED RESULTS (Kerr 5C) ---");
console.log("Skin Mass (kg):", resultados.masaPiel);
console.log("Adipose Mass (Kerr) (kg):", resultados.masaAdiposa);
console.log("Muscle Mass (kg):", resultados.masaMuscular);
console.log("Bone Mass (kg):", resultados.masaOsea);
console.log("Residual Mass (kg):", resultados.masaResidual);

const sumaMasas =
    resultados.masaPiel +
    resultados.masaAdiposa +
    resultados.masaMuscular +
    resultados.masaOsea +
    resultados.masaResidual;

console.log("\n--- SUM CHECK ---");
console.log("Sum of masses (kg):", sumaMasas.toFixed(2));
const weight = testSubject.peso || 0;
console.log("Real Weight (kg):", weight);
console.log("Difference (kg):", (weight - sumaMasas).toFixed(2));

if (Math.abs(weight - sumaMasas) < 0.5) {
    console.log("OK: SUM MATCHES WEIGHT");
} else {
    console.log("WARNING: SUM DOES NOT MATCH. Mixing 2C vs 5C models?");
}

console.log("\n--- ADDITIONAL DETAILS ---");
console.log("Fat Percentage (Display):", resultados.porcentajeGrasa + "%");
console.log("Method used:", resultados.metodo);
