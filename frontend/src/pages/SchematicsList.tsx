import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SchematicsList() {
    const { user } = useAuth();
    const [esquemas, setEsquemas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [powerFilter, setPowerFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchEsquemas();
    }, [search, powerFilter]);

    const fetchEsquemas = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);
            if (powerFilter) queryParams.append('power', powerFilter);

            const data = await apiRequest(`/esquemas?${queryParams.toString()}`);
            setEsquemas(data);
        } catch (error) {
            console.error('Error fetching esquemas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de eliminar este esquema?')) return;
        try {
            await apiRequest(`/esquemas/${id}`, { method: 'DELETE' });
            fetchEsquemas();
        } catch (error) {
            alert('Error eliminando esquema');
        }
    };

    const handleCreate = async () => {
        const name = prompt('Obra / Descripción:');
        if (!name) return;

        // Minimal data to create
        const client = prompt('Cliente (Opcional):') || '';
        const address = prompt('Dirección (Opcional):') || '';
        const powerInput = prompt('Potencia Instalada (kW, Obligatorio):', '5.75');

        if (!powerInput) {
            alert('La potencia es obligatoria para crear un esquema.');
            return;
        }

        try {
            const newEsquema = await apiRequest('/esquemas', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    client,
                    address,
                    power: powerInput,
                    data: JSON.stringify({ cuadros: [] }) // Empty initial data
                })
            });
            navigate(`/esquemas/${newEsquema.id}`);
        } catch (error) {
            console.error(error);
            alert('Error creando esquema');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Esquemas Independientes</h1>
                    <p className="text-slate-400 mt-1">Gestión de esquemas eléctricos sin expediente asociado</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-sky-900/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Esquema
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="sm:col-span-3 relative">
                    <Search className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cliente o dirección..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-950 border-slate-700 text-slate-200 pl-10 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                    />
                </div>
                <div>
                    <select
                        value={powerFilter}
                        onChange={(e) => setPowerFilter(e.target.value)}
                        className="w-full bg-slate-950 border-slate-700 text-slate-200 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                    >
                        <option value="">Todas las potencias</option>
                        <option value="3.45">3.45 kW</option>
                        <option value="4.6">4.6 kW</option>
                        <option value="5.75">5.75 kW</option>
                        <option value="6.9">6.9 kW</option>
                        <option value="9.2">9.2 kW</option>
                        <option value="custom">Otras</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando esquemas...</p>
                </div>
            ) : esquemas.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                    <p className="text-slate-500 mb-4">No se encontraron esquemas</p>
                    <button onClick={handleCreate} className="text-sky-400 hover:text-sky-300 font-medium">
                        Crear el primero ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {esquemas.map((esquema) => (
                        <div
                            key={esquema.id}
                            onClick={() => navigate(`/esquemas/${esquema.id}`)}
                            className="group bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/esquemas/${esquema.id}`); }}
                                    className="p-2 bg-slate-800 text-sky-400 rounded-lg hover:bg-sky-500 hover:text-white transition-colors"
                                    title="Editar"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                {user?.role === 'ADMIN' && (
                                    <button
                                        onClick={(e) => handleDelete(esquema.id, e)}
                                        className="p-2 bg-slate-800 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-sky-400 transition-colors truncate">
                                    {esquema.name}
                                </h3>
                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                    {esquema.client || 'Cliente sin nombre'}
                                </p>
                            </div>

                            <div className="space-y-2 text-sm text-slate-500 border-t border-slate-800 pt-4">
                                <div className="flex justify-between">
                                    <span>Dirección:</span>
                                    <span className="text-slate-300 truncate max-w-[60%]">{esquema.address || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Potencia:</span>
                                    <span className="text-slate-300">{esquema.power} kW</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Actualizado:</span>
                                    <span className="text-slate-300">
                                        {new Date(esquema.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
