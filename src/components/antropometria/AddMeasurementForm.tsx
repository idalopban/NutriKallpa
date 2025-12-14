"use client";

import { useState } from "react";
import { SKINFOLD_OPTIONS, SkinfoldType } from "@/lib/skinfold-coordinates";
import { PlusCircle } from "lucide-react";

interface AddMeasurementFormProps {
    onAdd: (type: SkinfoldType, value: number) => void;
}

export function AddMeasurementForm({ onAdd }: AddMeasurementFormProps) {
    const [selectedType, setSelectedType] = useState<SkinfoldType>("triceps");
    const [value, setValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
            alert("Por favor ingresa un valor válido en mm");
            return;
        }

        onAdd(selectedType, numValue);
        setValue("");
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#ff8508]" />
                Agregar Medición
            </h4>

            <div className="space-y-3">
                {/* Selector de pliegue */}
                <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Pliegue Cutáneo
                    </label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as SkinfoldType)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#ff8508] focus:border-transparent transition-all"
                    >
                        {SKINFOLD_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Input de valor */}
                <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Valor (mm)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Ej: 12.5"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#ff8508] focus:border-transparent transition-all"
                    />
                </div>

                {/* Botón submit */}
                <button
                    type="submit"
                    className="w-full py-2.5 bg-[#ff8508] hover:bg-[#e67607] text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                >
                    Agregar Pliegue
                </button>
            </div>
        </form>
    );
}
