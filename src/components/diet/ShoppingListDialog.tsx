import React, { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Share2, Copy, Check, Leaf, Apple, Beef, Milk, Wheat, Droplet, CupSoda } from 'lucide-react';
import { DailyPlan } from '@/lib/diet-generator';
import { generateShoppingList, ShoppingCategory } from '@/lib/shopping-list-utils';
import { toast } from 'sonner';

type WeeklyPlan = DailyPlan[];

interface ShoppingListProps {
    plan: WeeklyPlan;
}

export function ShoppingListDialog({ plan }: ShoppingListProps) {
    const [list, setList] = useState<ShoppingCategory[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setList(generateShoppingList(plan));
        }
    }, [isOpen, plan]);

    const generateListText = () => {
        let text = "🛒 *LISTA DE COMPRAS - NUTRIKALLPA*\n\n";
        list.forEach(cat => {
            text += `*${cat.name}*\n`;
            cat.items.forEach(item => {
                const measure = item.householdMeasure ? ` (${item.householdMeasure})` : '';
                text += `• ${item.name}: ${item.quantity}${item.unit}${measure}\n`;
            });
            text += "\n";
        });
        return text;
    };

    const handleCopy = () => {
        const text = generateListText();
        navigator.clipboard.writeText(text);
        toast.success("Lista copiada al portapapeles");
    };

    const handleShareWhatsapp = () => {
        const text = generateListText();
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Helper to get category icon
    const getCategoryIcon = (catName: string) => {
        const lower = catName.toLowerCase();
        if (lower.includes('vegetal')) return <Leaf className="w-4 h-4 text-emerald-600" />;
        if (lower.includes('fruta')) return <Apple className="w-4 h-4 text-rose-500" />;
        if (lower.includes('carne')) return <Beef className="w-4 h-4 text-red-600" />;
        if (lower.includes('lacteo')) return <Milk className="w-4 h-4 text-sky-500" />;
        if (lower.includes('cereal')) return <Wheat className="w-4 h-4 text-amber-500" />;
        if (lower.includes('grasa')) return <Droplet className="w-4 h-4 text-yellow-500" />;
        if (lower.includes('bebida')) return <CupSoda className="w-4 h-4 text-teal-500" />;
        return <ShoppingCart className="w-4 h-4 text-slate-500" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    Lista de Compras
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-50/50 sm:rounded-2xl border-0 shadow-2xl">
                {/* Header Moderno con Gradiente Sutil */}
                <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100/80 rounded-xl text-emerald-700 shadow-sm">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                                Lista de Compras
                            </DialogTitle>
                            <p className="text-sm text-slate-500 font-medium">
                                Plan Semanal Consolidado
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 relative z-10">
                        <Button onClick={handleCopy} variant="secondary" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 shadow-sm transition-all hover:scale-[1.02]">
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copiar</span>
                        </Button>
                        <Button onClick={handleShareWhatsapp} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]">
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {list.map((cat, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                        {getCategoryIcon(cat.name)}
                                    </div>
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">{cat.name}</h3>
                                    <div className="h-px flex-1 bg-slate-200/60" />
                                </div>

                                <div className="space-y-2">
                                    {cat.items.map((item, j) => (
                                        <div key={j} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 hover:bg-slate-50/50 transition-all duration-200">

                                            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-emerald-400 flex items-center justify-center transition-colors shrink-0 mt-0.5 sm:mt-0">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>

                                                <span className="font-medium text-slate-700 text-[15px] group-hover:text-slate-900 transition-colors leading-snug">
                                                    {item.name}
                                                </span>
                                            </div>

                                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0 pl-8 sm:pl-0">
                                                <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                    {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                                                </span>
                                                {item.householdMeasure && (
                                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-100/50 whitespace-nowrap">
                                                        {item.householdMeasure}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {list.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                    <ShoppingCart className="w-8 h-8 text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-slate-900">Tu lista está vacía</p>
                                    <p className="text-sm text-slate-500">Genera una dieta primero para ver los ingredientes aquí.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-center sticky bottom-0 z-20">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Todas las cantidades calculadas en crudo (peso compra) con factor de desecho estimado.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
