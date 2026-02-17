
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
                <div className="space-y-3 sm:space-y-0 sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {expedientes.map((expediente) => (
                        <Link
                            key={expediente.id}
                            to={`/expedientes/${expediente.id}`}
                            className="block w-full text-left rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-3.5 shadow-sm shadow-slate-950/50 active:scale-[0.99] transition transform hover:border-slate-700"
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-semibold tracking-wide text-slate-200">
                                            {expediente.code}
                                        </p>
                                        {expediente.authorization?.signaturePath && (
                                            <span title="Firmado" className="text-xs">✍️</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2 font-medium">
                                        {expediente.client?.name || 'Cliente sin nombre'}
                                    </p>
                                </div>
                                <EstadoPill estado={expediente.status} />
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
                                <span>{new Date(expediente.createdAt).toLocaleDateString('es-ES')}</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
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
