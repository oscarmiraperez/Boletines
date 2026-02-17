
export const EstadoPill = ({ estado }: { estado: string }) => {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";

    if (estado === "SIN_COMPLETAR" || estado === "Pendiente firma") { // Mapping common statuses
        return (
            <span className={`${base} bg-amber-500/10 text-amber-300 border-amber-500/40`}>
                {estado.replace('_', ' ')}
            </span>
        );
    }

    if (estado === "TERMINADO" || estado === "Completado") {
        return (
            <span className={`${base} bg-emerald-500/10 text-emerald-300 border-emerald-500/40`}>
                {estado}
            </span>
        );
    }

    if (estado === "ANULADO") {
        return (
            <span className={`${base} bg-red-500/10 text-red-300 border-red-500/40`}>
                {estado}
            </span>
        );
    }

    return (
        <span className={`${base} bg-slate-700 text-slate-200 border-slate-600`}>
            {estado.replace('_', ' ')}
        </span>
    );
};
