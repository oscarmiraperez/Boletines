
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { EstadoPill } from '../components/EstadoPill';

interface Expediente {
    id: string;
    code: string;
    type: string;
    status: string;
    client: { name: string };
    installation: { address: string; cups: string };
    createdAt: string;
    authorization?: {
        signaturePath?: string;
        idCardPath?: string;
    };
}

export default function Dashboard() {
    const [expedientes, setExpedientes] = useState<Expediente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchExpedientes();
    }, [statusFilter]);

    const fetchExpedientes = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('search', searchTerm);
            if (statusFilter) queryParams.append('status', statusFilter);

            const url = `/expedientes?${queryParams.toString()}`;
            const data = await apiRequest(url);
            setExpedientes(data);
        } catch (error) {
            console.error('Error al cargar expedientes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchExpedientes();
    };

    return (
        <div className="space-y-6">
            {/* Header + New Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-xl font-bold text-slate-100">Mis Boletines</h1>
                <Link
                    to="/expedientes/new"
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/20 hover:bg-sky-400 active:bg-sky-500 active:scale-[0.99] transition-all"
                >
                    + Nuevo Boletín
                </Link>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Buscar cliente, código..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="absolute right-3 top-2.5 text-slate-400 hover:text-sky-400">
                        🔍
                    </button>
                </form>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                    <option value="">Todos los Estados</option>
                    <option value="SIN_VISITAR">Sin Visitar</option>
                    <option value="VISITADO">Visitado</option>
                    <option value="SIN_COMPLETAR">Sin Completar</option>
                    <option value="TERMINADO">Terminado</option>
                    <option value="ANULADO">Anulado</option>
                </select>
            </div>

            {/* Content State */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
            ) : expedientes.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
                    <p className="text-slate-500 text-sm">No se encontraron boletines.</p>
                </div>
            ) : (
                /* Cards Grid (Mobile First) */
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {expedientes.map((expediente) => (
                        <Link
                            key={expediente.id}
                            to={`/expedientes/${expediente.id}`}
                            className="group relative flex flex-col justify-between rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-4 shadow-sm shadow-slate-950/50 hover:border-slate-700 hover:shadow-md transition-all overflow-hidden"
                        >
                            <div className="mb-3">
                                {/* Status Pill - Absolute positioned */}
                                <div className="absolute top-4 right-4">
                                    <EstadoPill estado={expediente.status} />
                                </div>

                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="min-w-0 flex-1 pr-20"> {/* Added padding-right to avoid overlap */}
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold tracking-wide text-slate-100 truncate">
                                                {expediente.code}
                                            </p>
                                            {expediente.authorization?.signaturePath && (
                                                <span title="Firmado" className="text-xs shrink-0">✍️</span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400 font-medium truncate" title={expediente.client?.name}>
                                            {expediente.client?.name || 'Cliente sin nombre'}
                                        </p>
                                    </div>
                                </div>
                                <div className="min-h-[2.5em]">
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed break-words" title={expediente.installation?.address}>
                                        {expediente.installation?.address || 'Sin dirección'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                <span>{new Date(expediente.createdAt).toLocaleDateString('es-ES')}</span>
                                <span className="flex items-center gap-1.5 text-sky-500/80">
                                    <span className="h-1 w-1 rounded-full bg-sky-500"></span>
                                    <span>BT</span>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
