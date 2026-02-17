import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'TECNICO' | 'OPERARIO';
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'TECNICO' });
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
        setFormData({ name: user.name, email: user.email, password: '', role: user.role });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'TECNICO' });
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
                <div className="bg-slate-900 shadow overflow-hidden sm:rounded-lg border border-slate-800">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-950">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900 divide-y divide-slate-800">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-200">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-400">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openEdit(user)} className="text-sky-400 hover:text-sky-300 mr-4">Editar</button>
                                        <button onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-300">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 overflow-y-auto h-full w-full flex items-center justify-center">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-lg shadow-xl w-96">
                        <h2 className="text-xl font-bold mb-4 text-slate-100">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-slate-300 text-sm font-bold mb-2">Nombre</label>
                                <input
                                    type="text"
                                    className="shadow appearance-none border border-slate-700 rounded w-full py-2 px-3 text-slate-200 bg-slate-800 leading-tight focus:outline-none focus:shadow-outline"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-slate-300 text-sm font-bold mb-2">Email</label>
                                <input
                                    type="email"
                                    className="shadow appearance-none border border-slate-700 rounded w-full py-2 px-3 text-slate-200 bg-slate-800 leading-tight focus:outline-none focus:shadow-outline"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-4">
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
                            <div className="mb-6">
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
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
