
export const EstadoPill = ({ estado }: { estado: string }) => {
    let colorClass = "bg-slate-500 border-slate-400 shadow-slate-500/50";
    let label = estado.replace('_', ' ');

    if (estado === "SIN_COMPLETAR" || estado === "EN_CURSO") {
        colorClass = "bg-amber-500 border-amber-400 shadow-amber-500/50";
    } else if (estado === "TERMINADO" || estado === "Completado") {
        colorClass = "bg-emerald-500 border-emerald-400 shadow-emerald-500/50";
    } else if (estado === "SIN_VISITAR" || estado === "ANULADO") {
        colorClass = "bg-red-500 border-red-400 shadow-red-500/50";
    }

    return (
        <div className="flex items-center gap-2" title={label}>
            <span className={`block w-3 h-3 rounded-full border shadow-sm ${colorClass}`}></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:block">
                {label}
            </span>
        </div>
    );
};
