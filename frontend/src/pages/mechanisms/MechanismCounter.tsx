
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { getMechanismProjectDetails, upsertMechanismItem } from '../../api';

// Default items as per User Request
const DEFAULT_ITEMS = [
    "Enchufe", "Conmutador", "Cruzamiento", "Interruptor",
    "Doble interruptor", "Doble conmutador", "Mecanismo persiana",
    "Salida de cordón", "Tapa ciega", "TV", "RJ45", "Roseta de fibra",
    "Marco 1 elemento", "Marco 2 elementos", "Marco 3 elementos", "Marco 4 elementos"
];

interface Item {
    id?: string;
    name: string;
    quantity: number;
}

export default function MechanismCounter() {
    const { projectId, roomId } = useParams<{ projectId: string; roomId: string }>();
    const navigate = useNavigate();

    // State
    const [roomName, setRoomName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [editQuantity, setEditQuantity] = useState(0);

    // Custom Item Modal
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customItemName, setCustomItemName] = useState('');

    // Long Press Logic
    const timerRef = useRef<number | null>(null);
    const isLongPress = useRef(false);

    useEffect(() => {
        if (projectId) loadData();
    }, [projectId, roomId]);

    const loadData = async () => {
        try {
            const data = await getMechanismProjectDetails(projectId!);
            if (data) {
                setProjectName(data.name);
                const room = data.rooms.find((r: any) => r.id === roomId);
                if (room) {
                    setRoomName(room.name);
                    // Merge DB items with Default items to ensure grid shows defaults even if 0
                    const dbItems = room.items || [];
                    const mergedItems: Item[] = [];

                    // 1. Add DB items (both defaults and custom)
                    dbItems.forEach((dbItem: any) => {
                        mergedItems.push({ ...dbItem });
                    });

                    // 2. Add Defaults if not present
                    DEFAULT_ITEMS.forEach(defName => {
                        if (!mergedItems.find(i => i.name === defName)) {
                            mergedItems.push({ name: defName, quantity: 0 });
                        }
                    });

                    // Sort: custom items at end? Or keep strict order? 
                    // User request: "Default list... Others".
                    // Let's sort by: Defaults first (in order), then Custom.

                    const sorted = mergedItems.sort((a, b) => {
                        const idxA = DEFAULT_ITEMS.indexOf(a.name);
                        const idxB = DEFAULT_ITEMS.indexOf(b.name);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.name.localeCompare(b.name);
                    });

                    setItems(sorted);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    // 1. Optimistic Update & Save
    const updateItemQuantity = async (name: string, newQuantity: number) => {
        // Optimistic UI
        setItems(prev => prev.map(item =>
            item.name === name ? { ...item, quantity: newQuantity } : item
        ));

        // API Call (Fire and forget or debounced ideally, but direct for simplicity first)
        try {
            await upsertMechanismItem({
                roomId: roomId!,
                name: name,
                quantity: newQuantity
            });
        } catch (error) {
            console.error("Failed to save item", error);
            // Revert? (Not implemented for MVP speed)
        }
    };

    const handleIncrement = (name: string, currentQty: number) => {
        updateItemQuantity(name, currentQty + 1);
    };

    // --- Interaction Handlers (Click vs Long Press) ---

    const startPress = (item: Item) => {
        isLongPress.current = false;
        timerRef.current = window.setTimeout(() => {
            isLongPress.current = true;
            // Trigger Long Press Action
            openEditModal(item);
        }, 500); // 500ms long press
    };

    const endPress = (item: Item) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (!isLongPress.current) {
            // Normal Click
            handleIncrement(item.name, item.quantity);
        }
    };

    // --- Modals ---

    const openEditModal = (item: Item) => {
        setEditingItem(item);
        setEditQuantity(item.quantity);
        setIsEditModalOpen(true);
    };

    const saveEdit = () => {
        if (editingItem) {
            updateItemQuantity(editingItem.name, editQuantity);
            setIsEditModalOpen(false);
            setEditingItem(null);
        }
    };

    const createCustomItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await upsertMechanismItem({
                roomId: roomId!,
                name: customItemName,
                quantity: 0
            });
            setCustomItemName('');
            setIsCustomModalOpen(false);
            loadData(); // Reload to re-sort and include new item
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="text-center py-10 text-slate-500">Cargando...</div>;

    return (
        <div className="space-y-4 pb-20 select-none"> {/* select-none prevents text selection during tapping */}
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(`/mecanismos/${projectId}`)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors w-fit"
                >
                    <ArrowLeft size={18} />
                    <span className="truncate max-w-[150px]">{projectName}</span>
                </button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
                <h1 className="text-2xl font-bold text-slate-100">{roomName}</h1>
                <p className="text-xs text-slate-400 mt-1">Pulsa para contar • Mantén para editar</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item) => (
                    <button
                        key={item.name}
                        onMouseDown={() => startPress(item)}
                        onMouseUp={() => endPress(item)}
                        onMouseLeave={() => {
                            if (timerRef.current) {
                                clearTimeout(timerRef.current);
                                timerRef.current = null;
                            }
                        }}
                        onTouchStart={() => startPress(item)}
                        onTouchEnd={(e) => {
                            e.preventDefault(); // Prevent ghost clicks
                            endPress(item);
                        }}
                        className={`
                            relative h-32 rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95
                            ${item.quantity > 0
                                ? 'bg-amber-500/10 border-2 border-amber-500 text-amber-500'
                                : 'bg-slate-800 border-2 border-transparent text-slate-400 hover:bg-slate-750'}
                        `}
                    >
                        <span className="text-sm font-medium text-center px-2 leading-tight">
                            {item.name}
                        </span>

                        <span className={`text-4xl font-bold ${item.quantity > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {item.quantity}
                        </span>

                        {item.quantity > 0 && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>

            {/* Add Custom Button */}
            <button
                onClick={() => setIsCustomModalOpen(true)}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-700 text-slate-500 hover:border-amber-500/50 hover:text-amber-500 transition-colors flex items-center justify-center gap-2"
            >
                <Plus size={20} />
                <span>Añadir otro tipo de mecanismo</span>
            </button>

            {/* --- MODALS --- */}

            {/* EDIT QUANTITY MODAL */}
            {isEditModalOpen && editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-100 mb-2 truncate">{editingItem.name}</h2>
                        <p className="text-slate-400 mb-6 text-sm">Ajustar cantidad manual</p>

                        <div className="flex items-center justify-center gap-6 mb-8">
                            <button
                                onClick={() => setEditQuantity(Math.max(0, editQuantity - 1))}
                                className="h-14 w-14 rounded-xl bg-slate-800 text-slate-200 text-2xl font-bold flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                            >
                                -
                            </button>
                            <span className="text-5xl font-mono font-bold text-amber-500 w-24 text-center">
                                {editQuantity}
                            </span>
                            <button
                                onClick={() => setEditQuantity(editQuantity + 1)}
                                className="h-14 w-14 rounded-xl bg-slate-800 text-slate-200 text-2xl font-bold flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                            >
                                +
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setEditQuantity(0)}
                                className="px-4 py-3 rounded-lg bg-slate-800 text-red-400 font-medium hover:bg-red-950/30 transition-colors"
                            >
                                Poner a 0
                            </button>
                            <button
                                onClick={saveEdit}
                                className="px-4 py-3 rounded-lg bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="w-full mt-3 py-3 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* CUSTOM ITEM MODAL */}
            {isCustomModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Nuevo tipo de mecanismo</h2>
                        <form onSubmit={createCustomItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={customItemName}
                                    onChange={(e) => setCustomItemName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="Ej: Toma USB, Detector..."
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsCustomModalOpen(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary bg-amber-500 text-slate-900 hover:bg-amber-400">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
