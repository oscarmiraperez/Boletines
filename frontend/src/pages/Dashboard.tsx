import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';

interface Expediente {
    id: string;
    code: string;
    type: string; // Alta, Modificación, etc.
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

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiRequest(`/expedientes/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            setExpedientes(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
        } catch (error) {
            console.error('Error updating status', error);
            alert('Error al actualizar estado');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este expediente?')) return;
        try {
            await apiRequest(`/expedientes/${id}`, {
                method: 'DELETE'
            });
            setExpedientes(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting expediente', error);
            alert('Error al eliminar expediente');
        }
    };

    return (
        <div className="px-4 sm:px-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-gray-900">Mis Expedientes</h1>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Buscar (código, cliente, dirección)..."
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded border border-gray-300">
                            🔍
                        </button>
                    </form>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                    >
                        <option value="">Todos los Estados</option>
                        <option value="SIN_VISITAR">Sin Visitar</option>
                        <option value="VISITADO">Visitado</option>
                        <option value="SIN_COMPLETAR">Sin Completar</option>
                        <option value="TERMINADO">Terminado</option>
                        <option value="ANULADO">Anulado</option>
                    </select>

                    <Link
                        to="/expedientes/new"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Nuevo Expediente
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-4">Cargando...</div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {expedientes.length === 0 ? (
                            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">No hay expedientes aún.</li>
                        ) : (
                            expedientes.map((expediente) => (
                                <li key={expediente.id}>
                                    <div className="block hover:bg-gray-50 relative">
                                        <Link to={`/expedientes/${expediente.id}`} className="block px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <p className="text-sm font-medium text-blue-600 truncate mr-3">{expediente.code}</p>
                                                    {expediente.authorization?.signaturePath && (
                                                        <span className="mr-2 text-lg" title="Autorización Firmada">✍️</span>
                                                    )}
                                                    {expediente.authorization?.idCardPath && (
                                                        <span className="mr-2 text-lg" title="DNI Subido">🆔</span>
                                                    )}
                                                </div>
                                                {/* Filler to push actions to right, but layout handles it. 
                                                    The actions are absolute or right-aligned. 
                                                    Let's use a wrapper that prevents propagation for the controls. 
                                                */}
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500 mr-4">
                                                        {/* Icon User */} 👤 {expediente.client?.name || 'Cliente desconocido'}
                                                    </p>
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        {/* Icon Location */} 📍 {expediente.installation?.address || 'Sin dirección'}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p>📅 {new Date(expediente.createdAt).toLocaleDateString('es-ES')}</p>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Actions: Status Dropdown & Delete */}
                                        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white pl-2">
                                            <select
                                                value={expediente.status}
                                                onChange={(e) => handleStatusChange(expediente.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`text-xs font-semibold rounded-full py-1 pl-2 pr-6 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer
                                                    ${expediente.status === 'EN_CURSO' ? 'bg-yellow-100 text-yellow-800' :
                                                        expediente.status === 'CERRADO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                            >
                                                <option value="SIN_VISITAR">Sin Visitar</option>
                                                <option value="VISITADO">Visitado</option>
                                                <option value="SIN_COMPLETAR">Sin Completar</option>
                                                <option value="TERMINADO">Terminado</option>
                                                <option value="ANULADO">Anulado</option>
                                            </select>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(expediente.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                                title="Eliminar Expediente"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
