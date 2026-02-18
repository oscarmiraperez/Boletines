
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Trash2, Edit2, FileText, ChevronRight } from 'lucide-react';
import {
    getMechanismProjectDetails,
    createMechanismRoom,
    deleteMechanismRoom,
    updateMechanismRoom,
    copyMechanismRoom,
    generateMechanismProjectPDF
} from '../../api';

interface Room {
    id: string;
    name: string;
    items: any[];
}

interface ProjectDetail {
    id: string;
    name: string;
    description?: string;
    rooms: Room[];
}

export default function RoomList() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Forms
    const [newRoomName, setNewRoomName] = useState('');
    const [copyCount, setCopyCount] = useState(1);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [editRoomName, setEditRoomName] = useState('');

    useEffect(() => {
        if (id) loadProject();
    }, [id]);

    const loadProject = async () => {
        setLoading(true);
        try {
            const data = await getMechanismProjectDetails(id!);
            setProject(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createMechanismRoom({ projectId: id!, name: newRoomName });
            setNewRoomName('');
            setIsAddModalOpen(false);
            loadProject();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCopyRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) return;
        try {
            await copyMechanismRoom({ roomId: selectedRoom.id, count: copyCount });
            setCopyCount(1);
            setSelectedRoom(null);
            setIsCopyModalOpen(false);
            loadProject();
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) return;
        try {
            await updateMechanismRoom(selectedRoom.id, { name: editRoomName });
            setEditRoomName('');
            setSelectedRoom(null);
            setIsEditModalOpen(false);
            loadProject();
        } catch (error) {
            console.error(error);
        }
    };

    const handleGeneratePDF = async () => {
        if (!id) return;
        try {
            const blob = await generateMechanismProjectPDF(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mecanismos-${project?.name}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error(error);
            alert('Error al generar PDF');
        }
    };

    const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Borrar esta estancia y todos sus mecanismos?')) return;
        try {
            await deleteMechanismRoom(roomId);
            loadProject();
        } catch (error) {
            console.error(error);
        }
    };

    const openCopyModal = (e: React.MouseEvent, room: Room) => {
        e.stopPropagation();
        setSelectedRoom(room);
        setIsCopyModalOpen(true);
    };

    const openEditModal = (e: React.MouseEvent, room: Room) => {
        e.stopPropagation();
        setSelectedRoom(room);
        setEditRoomName(room.name);
        setIsEditModalOpen(true);
    };

    if (loading) return <div className="text-center py-10 text-slate-500">Cargando...</div>;
    if (!project) return <div className="text-center py-10 text-red-500">Proyecto no encontrado</div>;

    // Empty State
    if (project.rooms.length === 0) {
        return (
            <div className="space-y-6 pb-20">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/mecanismos')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors w-fit"
                    >
                        <ArrowLeft size={18} />
                        <span>Volver a Proyectos</span>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
                </div>

                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                    <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-200">No hay estancias creadas</h3>
                    <p className="text-slate-500 max-w-xs mt-2 mb-6">Empieza añadiendo habitaciones, cocina, salón...</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
                    >
                        Añadir Primera Estancia
                    </button>
                </div>

                {/* Keep Modals available even in empty state */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Añadir Estancia</h2>
                            <form onSubmit={handleCreateRoom} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                        placeholder="Ej: Dormitorio 1"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 btn-secondary">Cancelar</button>
                                    <button type="submit" className="flex-1 btn-primary bg-amber-500 text-slate-900 hover:bg-amber-400">Crear</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate('/mecanismos')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors w-fit"
                >
                    <ArrowLeft size={18} />
                    <span>Volver a Proyectos</span>
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
                        <p className="text-slate-400 text-sm">Estancias del proyecto</p>
                    </div>
                    <button
                        onClick={handleGeneratePDF}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors border border-slate-700 active:scale-95"
                    >
                        <FileText size={18} />
                        <span className="hidden sm:inline">Generar PDF</span>
                    </button>
                </div>
            </div>

            {/* Room List */}
            <div className="space-y-3">
                {project.rooms.map((room) => (
                    <div
                        key={room.id}
                        onClick={() => navigate(`/mecanismos/${id}/room/${room.id}`)}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
                    >
                        <div>
                            <h3 className="font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                                {room.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {room.items.reduce((acc, item) => acc + item.quantity, 0)} mecanismos
                            </p>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Quick Actions */}
                            <button
                                onClick={(e) => openCopyModal(e, room)}
                                className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition-colors"
                                title="Copiar Estancia"
                            >
                                <Copy size={18} />
                            </button>
                            <button
                                onClick={(e) => openEditModal(e, room)}
                                className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-950/30 rounded-lg transition-colors"
                                title="Renombrar"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={(e) => handleDeleteRoom(e, room.id)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                                title="Borrar"
                            >
                                <Trash2 size={18} />
                            </button>
                            <ChevronRight size={20} className="text-slate-600 ml-2" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Add Button */}
            <div className="fixed bottom-24 right-6 z-40">
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 w-14 rounded-full shadow-lg shadow-amber-900/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus size={28} />
                </button>
            </div>

            {/* --- MODALS --- */}

            {/* ADD ROOM MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Añadir Estancia</h2>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="Ej: Dormitorio 1"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary bg-amber-500 text-slate-900 hover:bg-amber-400">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COPY ROOM MODAL */}
            {isCopyModalOpen && selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Copiar Estancia</h2>
                        <p className="text-slate-400 text-sm mb-4">
                            Estancia base: <span className="text-slate-200 font-medium">{selectedRoom.name}</span>
                        </p>
                        <form onSubmit={handleCopyRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Número de copias</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    required
                                    value={copyCount}
                                    onChange={(e) => setCopyCount(parseInt(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Se crearán {copyCount} copias de esta estancia y sus mecanismos.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsCopyModalOpen(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary bg-amber-500 text-slate-900 hover:bg-amber-400">Crear Copias</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT ROOM MODAL */}
            {isEditModalOpen && selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Renombrar Estancia</h2>
                        <form onSubmit={handleUpdateRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={editRoomName}
                                    onChange={(e) => setEditRoomName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary bg-amber-500 text-slate-900 hover:bg-amber-400">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
