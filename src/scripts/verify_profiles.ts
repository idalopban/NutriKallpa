
import { calculateAnthropometry, TipoPaciente } from "../lib/calculos-nutricionales";
import { MedidasAntropometricas } from "../types";

const testSubject: MedidasAntropometricas = {
    id: "test-1",
    pacienteId: "p-1",
    fecha: new Date().toISOString(),
    peso: 75.0,
    talla: 175.0,
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

const profiles: TipoPaciente[] = ['general', 'control', 'fitness', 'atleta', 'rapida'];

console.log("--- PROFILE VERIFICATION ---");

profiles.forEach(profile => {
    const res = calculateAnthropometry(testSubject, profile);
    console.log(`\nPROFILE: ${profile.toUpperCase()}`);
    console.log(`Method: ${res.metodo}`);
    console.log(`Body Density: ${res.densidadCorporal}`);
    console.log(`Fat %: ${res.porcentajeGrasa}%`);
});
