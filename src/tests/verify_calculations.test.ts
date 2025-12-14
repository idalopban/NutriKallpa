import { describe, it, expect } from 'vitest'
import { calculateAnthropometry } from '../lib/calculos-nutricionales'
import type { MedidasAntropometricas } from '../types'

const testSubject: MedidasAntropometricas = {
  id: 'test-1',
  pacienteId: 'p-1',
  fecha: new Date().toISOString(),
  tipoPaciente: 'general',
  peso: 75.0,
  talla: 175.0,
  edad: 25,
  sexo: 'masculino',
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
}

describe('Anthropometry verification', () => {
  it('sums Kerr 5C masses close to real weight and returns sensible fat/density', () => {
    const res = calculateAnthropometry(testSubject, 'general')

    // masses from Kerr (masaAdiposa, masaMuscular, masaOsea, masaResidual, masaPiel)
    const sum = Number(res.masaAdiposa) + Number(res.masaMuscular) + Number(res.masaOsea) + Number(res.masaResidual) + Number(res.masaPiel)

    // The sum should be reasonably close to the real weight (within 1 kg tolerance)
    expect(Math.abs(sum - testSubject.peso!)).toBeLessThanOrEqual(1.0)

    // Expect non-negative and sensible values for fat% and density
    expect(res.porcentajeGrasa).toBeGreaterThanOrEqual(0)
    expect(res.densidadCorporal).toBeGreaterThan(0)
  })
})
