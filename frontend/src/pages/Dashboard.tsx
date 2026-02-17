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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-xl font-bold text-slate-100">Mis Expedientes</h1>
                <Link
                    to="/expedientes/new"
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-colors"
                >
                    + Nuevo Expediente
                </Link>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Buscar por código, cliente..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="absolute right-2 top-2 text-slate-400 hover:text-sky-400">
                        🔍
                    </button>
                </form>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                    <option value="">Todos los Estados</option>
                    <option value="SIN_VISITAR">Sin Visitar</option>
                    <option value="VISITADO">Visitado</option>
                    <option value="SIN_COMPLETAR">Sin Completar</option>
                    <option value="TERMINADO">Terminado</option>
                    <option value="ANULADO">Anulado</option>
                </select>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-500">Cargando expedientes...</div>
            ) : expedientes.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
                    <p className="text-slate-500 text-sm">No se encontraron expedientes.</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {expedientes.map((expediente) => (
                        <Link
                            key={expediente.id}
                            to={`/expedientes/${expediente.id}`}
                            className="group relative block rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500/30 hover:bg-slate-900/90 transition-all active:scale-[0.99]"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-sky-400 group-hover:text-sky-300">
                                            {expediente.code}
                                        </span>
                                        {expediente.authorization?.signaturePath && (
                                            <span title="Firmado" className="text-xs">✍️</span>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-200 mt-1 line-clamp-1">
                                        {expediente.client?.name || 'Cliente sin nombre'}
                                    </h3>
                                </div>
                                <EstadoPill estado={expediente.status} />
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1.5">
                                    <span>📍</span> {expediente.installation?.address || 'Sin dirección'}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <span>📅</span> {new Date(expediente.createdAt).toLocaleDateString('es-ES')}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
