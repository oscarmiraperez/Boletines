import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';


interface ExpedienteSummary {
    id: string;
    code: string;
    status: string;
    type: string;
    createdAt: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'TECNICO' | 'OPERARIO';
    isActive: boolean;
    expedientesOperador: ExpedienteSummary[];
    expedientesTecnico: ExpedienteSummary[];
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'TECNICO', isActive: true });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (editingUser) {
                const { password, ...rest } = formData;
                const updateData = password ? formData : rest; // Only send password if changed
                await updateUser(editingUser.id, updateData);
            } else {
                await createUser(formData);
            }
            setIsModalOpen(false);
            fetchUsers();
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Error al guardar');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await deleteUser(id);
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'TECNICO', isActive: true });
    };

    const toggleStatus = async (user: User) => {
        try {
            await updateUser(user.id, { isActive: !user.isActive });
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert('Error al cambiar estado');
        }
    };

    const getAllExpedientes = (user: User) => {
        // Combine and dedup by ID (just in case, though usually roles are distinct per exp)
        const all = [...(user.expedientesOperador || []), ...(user.expedientesTecnico || [])];
        const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
        return unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    return (
        <div className="px-4 sm:px-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-slate-100">Gestión de Usuarios</h1>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Nuevo Usuario
                </button>
            </div>

            {loading ? <div className="text-center">Cargando...</div> : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-slate-900 shadow overflow-hidden sm:rounded-lg border border-slate-800">
                        <table className="min-w-full divide-y divide-slate-800">
                            <thead className="bg-slate-950">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Boletines</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-900 divide-y divide-slate-800">
                                {users.map(user => {
                                    const expCount = (user.expedientesOperador?.length || 0) + (user.expedientesTecnico?.length || 0);
                                    return (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    className="text-sky-400 hover:text-sky-300 hover:underline font-medium text-left"
                                                >
                                                    {user.name}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => toggleStatus(user)}
                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-colors
                                                    ${user.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
                                                >
                                                    {user.isActive ? 'Activo' : 'Pendiente'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-slate-400">
                                                {expCount > 0 ? (
                                                    <span className="bg-slate-800 px-2 py-1 rounded text-xs">{expCount}</span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => openEdit(user)} className="text-sky-400 hover:text-sky-300 mr-4">Editar</button>
                                                <button onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-300">Eliminar</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {users.map(user => {
                            const expCount = (user.expedientesOperador?.length || 0) + (user.expedientesTecnico?.length || 0);
                            return (
                                <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-slate-200 font-semibold text-lg">{user.name}</h3>
                                            <p className="text-slate-500 text-sm break-all">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={() => openEdit(user)}
                                            className="text-sky-400 hover:text-sky-300 p-2"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </button>
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                            ${user.role === 'ADMIN' ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50' : 'bg-green-900/40 text-green-300 border border-green-700/50'}`}>
                                            {user.role}
                                        </span>
                                        <button
                                            onClick={() => toggleStatus(user)}
                                            className={`px-2 py-1 text-xs font-semibold rounded-full border transition-colors
                                            ${user.isActive ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' : 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50'}`}
                                        >
                                            {user.isActive ? 'Activo' : 'Pendiente'}
                                        </button>
                                        {expCount > 0 && (
                                            <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded-full text-xs border border-slate-700">
                                                {expCount} Boletines
                                            </span>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-800/50 flex justify-end gap-3">
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-400 text-sm hover:text-red-300 hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
                                        >
                                            Eliminar Usuario
                                        </button>
                                        <button
                                            onClick={() => openEdit(user)}
                                            className="text-sky-400 text-sm hover:text-sky-300 hover:bg-sky-900/20 px-3 py-1.5 rounded transition-colors"
                                        >
                                            Ver Detalles
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-slate-100">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'} <span className="text-xs text-slate-500 font-normal ml-2">(v2.2)</span></h2>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Form Column */}
                                <form id="userForm" onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-slate-300 text-sm font-bold mb-2">Nombre</label>
                                        <input
                                            type="text"
                                            className="shadow appearance-none border border-slate-700 rounded w-full py-2 px-3 text-slate-200 bg-slate-800 leading-tight focus:outline-none focus:shadow-outline"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 text-sm font-bold mb-2">Email</label>
                                        <input
                                            type="email"
                                            className="shadow appearance-none border border-slate-700 rounded w-full py-2 px-3 text-slate-200 bg-slate-800 leading-tight focus:outline-none focus:shadow-outline"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 text-sm font-bold mb-2">
                                            Contraseña {editingUser && <span className="text-slate-500 font-normal">(dejar en blanco para no cambiar)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            className="shadow appearance-none border border-slate-700 rounded w-full py-2 px-3 text-slate-200 bg-slate-800 leading-tight focus:outline-none focus:shadow-outline"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            required={!editingUser}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 text-sm font-bold mb-2">Rol</label>
                                        <select
                                            className="shadow border border-slate-700 rounded w-full py-2 px-3 text-slate-200 bg-slate-800 leading-tight focus:outline-none focus:shadow-outline"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="TECNICO">Técnico</option>
                                            <option value="ADMIN">Administrador</option>
                                            <option value="OPERARIO">Operario</option>
                                        </select>
                                    </div>
                                </form>

                                {/* Expedientes Column */}
                                {editingUser && (
                                    <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-8 md:pt-0 md:pl-8">
                                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Boletines Asignados</h3>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {getAllExpedientes(editingUser).length === 0 ? (
                                                <p className="text-slate-500 text-sm">No tiene boletines asignados.</p>
                                            ) : (
                                                getAllExpedientes(editingUser).map(exp => (
                                                    <div
                                                        key={exp.id}
                                                        onClick={() => window.open(`/expedientes/${exp.id}`, '_blank')}
                                                        className="p-3 bg-slate-950/50 rounded border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-colors group"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-mono text-xs text-sky-400 group-hover:underline">
                                                                {exp.code || 'SIN CODIGO'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {new Date(exp.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <span className="text-xs text-slate-300">{exp.type}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                                                {exp.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="userForm"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
