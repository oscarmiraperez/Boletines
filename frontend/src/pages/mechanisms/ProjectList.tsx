
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, Folder, Edit2 } from 'lucide-react';
import { getMechanismProjects, createMechanismProject, deleteMechanismProject, updateMechanismProject } from '../../api';

interface Project {
    id: string;
    name: string;
    description?: string;
    _count?: {
        rooms: number;
    };
    updatedAt: string;
}

export default function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');

    // Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editProjectId, setEditProjectId] = useState<string | null>(null);
    const [editProjectName, setEditProjectName] = useState('');
    const [editProjectDesc, setEditProjectDesc] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await getMechanismProjects();
            setProjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newProject = await createMechanismProject({ name: newProjectName, description: newProjectDesc });
            setNewProjectName('');
            setNewProjectDesc('');
            setIsCreateModalOpen(false);
            // Auto navigate to the new project
            navigate(`/mecanismos/${newProject.id}`);
        } catch (error) {
            console.error(error);
            alert('Error al crear proyecto');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editProjectId) return;
        try {
            await updateMechanismProject(editProjectId, { name: editProjectName, description: editProjectDesc });
            setEditProjectId(null);
            setIsEditModalOpen(false);
            loadProjects();
        } catch (error) {
            console.error(error);
            alert('Error al actualizar proyecto');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Seguro que quieres borrar este proyecto?')) return;
        try {
            await deleteMechanismProject(id);
            loadProjects();
        } catch (error) {
            console.error(error);
            alert('Error al borrar el proyecto');
        }
    };

    const openEditModal = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setEditProjectId(project.id);
        setEditProjectName(project.name);
        setEditProjectDesc(project.description || '');
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Proyectos de Mecanismos</h1>
                    <p className="text-slate-400 mt-1">Gestión de contadores de material</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Nuevo Proyecto</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Cargando...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => navigate(`/mecanismos/${project.id}`)}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <Folder size={20} />
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                                        {project.name}
                                    </h3>
                                    {project.description && (
                                        <p className="text-sm text-slate-500">{project.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                                        <span>{project._count?.rooms || 0} estancias</span>
                                        <span>•</span>
                                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => openEditModal(e, project)}
                                    className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-950/30 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, project.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <ChevronRight size={20} className="text-slate-600 group-hover:text-slate-400" />
                            </div>
                        </div>
                    ))}

                    {projects.length === 0 && (
                        <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                            <p className="text-slate-500">No hay proyectos creados</p>
                        </div>
                    )}
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Nuevo Proyecto</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="Ej: Reforma Piso Centro"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descripción (Opcional)</label>
                                <input
                                    type="text"
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="Ej: Calle Mayor 12"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium"
                                >
                                    Crear Proyecto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Editar Proyecto</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={editProjectName}
                                    onChange={(e) => setEditProjectName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descripción (Opcional)</label>
                                <input
                                    type="text"
                                    value={editProjectDesc}
                                    onChange={(e) => setEditProjectDesc(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
