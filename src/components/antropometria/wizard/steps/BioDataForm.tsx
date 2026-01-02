"use client";

import { useAnthropometryStore } from "@/store/useAnthropometryStore";
import { Scale, Ruler, User, Calendar } from "lucide-react";

export function BioDataForm() {
    const { bioData, updateBioData } = useAnthropometryStore();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff8508] to-[#ff6b00] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#ff8508]/30">
                    <User className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Datos Básicos</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Ingresa los datos antropométricos iniciales</p>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">

                {/* Peso */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-800 dark:text-white">Peso Corporal</label>
                            <p className="text-xs text-slate-400">En kilogramos</p>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            min="30"
                            max="300"
                            value={bioData.peso || ""}
                            onChange={(e) => updateBioData({ peso: parseFloat(e.target.value) || 0 })}
                            placeholder="70.5"
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#ff8508] focus:border-[#ff8508] outline-none transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-medium">kg</span>
                    </div>
                </div>

                {/* Talla */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Ruler className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-800 dark:text-white">Talla / Estatura</label>
                            <p className="text-xs text-slate-400">En centímetros</p>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            min="100"
                            max="250"
                            value={bioData.talla || ""}
                            onChange={(e) => updateBioData({ talla: parseFloat(e.target.value) || 0 })}
                            placeholder="175"
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#ff8508] focus:border-[#ff8508] outline-none transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-medium">cm</span>
                    </div>
                </div>

                {/* Edad */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-800 dark:text-white">Edad</label>
                            <p className="text-xs text-slate-400">En años cumplidos</p>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            min="5"
                            max="120"
                            value={bioData.edad || ""}
                            onChange={(e) => updateBioData({ edad: parseInt(e.target.value) || 0 })}
                            placeholder="25"
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#ff8508] focus:border-[#ff8508] outline-none transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-medium">años</span>
                    </div>
                </div>

                {/* Género */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-800 dark:text-white">Género Biológico</label>
                            <p className="text-xs text-slate-400">Para fórmulas de cálculo</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => updateBioData({ genero: 'masculino' })}
                            className={`py-4 px-6 rounded-xl font-bold text-lg transition-all ${bioData.genero === 'masculino'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            ♂ Masculino
                        </button>
                        <button
                            onClick={() => updateBioData({ genero: 'femenino' })}
                            className={`py-4 px-6 rounded-xl font-bold text-lg transition-all ${bioData.genero === 'femenino'
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            ♀ Femenino
                        </button>
                    </div>
                </div>
            </div>

            {/* IMC Preview */}
            {bioData.peso > 0 && bioData.talla > 0 && (
                <div className="max-w-2xl mx-auto mt-8 p-4 bg-gradient-to-r from-[#6cba00]/10 to-[#ff8508]/10 rounded-2xl border border-[#6cba00]/20">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">IMC Calculado</span>
                        <span className="text-2xl font-black text-[#6cba00]">
                            {(bioData.peso / Math.pow(bioData.talla / 100, 2)).toFixed(1)}
                            <span className="text-sm font-normal text-slate-400 ml-1">kg/m²</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
