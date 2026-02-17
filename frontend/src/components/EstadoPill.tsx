import { cn } from '../lib/utils';

interface EstadoPillProps {
    estado: string;
}

export const EstadoPill = ({ estado }: EstadoPillProps) => {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";

    let colorClass = "bg-slate-700 text-slate-200 border-slate-600"; // Default

    const lowerEstado = estado.toLowerCase();

    if (lowerEstado.includes('pendiente') || lowerEstado.includes('borrador')) {
        colorClass = "bg-amber-500/10 text-amber-300 border-amber-500/40";
    } else if (lowerEstado.includes('completado') || lowerEstado.includes('finalizado') || lowerEstado.includes('aprobado')) {
        colorClass = "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
    } else if (lowerEstado.includes('rechazado') || lowerEstado.includes('error')) {
        colorClass = "bg-red-500/10 text-red-300 border-red-500/40";
    }

    return (
        <span className={cn(base, colorClass)}>
            {estado}
        </span>
    );
};
