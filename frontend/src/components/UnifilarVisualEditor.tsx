import { useState } from 'react';
import { Device, DeviceType } from '../types/unifilar';
import { actualizarEtiquetaDispositivo } from '../utils/unifilarUtils';

interface Props {
    dispositivos: Device[];
    onUpdate: (dispositivos: Device[]) => void;
    igaPoles: number;
}

const SYMBOL_SIZE = 60;
const VERTICAL_GAP = 100;
const HORIZONTAL_GAP = 120;

const MagnetotermicoSymbol = () => (
    <svg width="40" height="60" viewBox="0 0 40 60" className="stroke-black fill-none">
        <line x1="20" y1="0" x2="20" y2="20" strokeWidth="2" />
        <line x1="20" y1="20" x2="10" y2="45" strokeWidth="2" />
        <line x1="20" y1="45" x2="20" y2="60" strokeWidth="2" />
        <circle cx="20" cy="20" r="2" fill="black" />
    </svg>
);

const DiferencialSymbol = () => (
    <svg width="40" height="60" viewBox="0 0 40 60" className="stroke-black fill-none">
        <line x1="20" y1="0" x2="20" y2="20" strokeWidth="2" />
        <line x1="20" y1="20" x2="10" y2="45" strokeWidth="2" />
        <line x1="20" y1="45" x2="20" y2="60" strokeWidth="2" />
        <circle cx="20" cy="20" r="2" fill="black" />
        <path d="M 12 35 Q 2 35 2 25 L 2 15" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
);

const FinalSymbol = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" className="stroke-black fill-none">
        <line x1="20" y1="0" x2="20" y2="20" strokeWidth="2" />
        <line x1="10" y1="20" x2="30" y2="20" strokeWidth="2" />
        <line x1="10" y1="20" x2="20" y2="35" strokeWidth="2" />
        <line x1="30" y1="20" x2="20" y2="35" strokeWidth="2" />
    </svg>
);

export default function UnifilarVisualEditor({ dispositivos, onUpdate, igaPoles }: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [menuId, setMenuId] = useState<string | null>(null);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);

    const handleLongPress = (id: string) => {
        setMenuId(id);
    };

    const handleAddChild = (parentId: string, type: DeviceType) => {
        const newDispositivos = [...dispositivos];
        const addChildRecursive = (nodes: Device[]): boolean => {
            for (const node of nodes) {
                if (node.id === parentId) {
                    const newChild: Device = {
                        id: Math.random().toString(36).substr(2, 9),
                        tipo: type,
                        num_polos: igaPoles === 2 ? 2 : 2,
                        calibre_A: type === 'diferencial' ? 40 : 16,
                        etiqueta_texto: '',
                        hijos: []
                    };
                    if (type === 'diferencial') {
                        newChild.sensibilidad_mA = 30;
                        newChild.tipo_diferencial = 'AC';
                    }
                    if (type === 'final_circuito') {
                        newChild.uso_base = 'Otros';
                        newChild.nombre_circuito_usuario = '';
                    }
                    actualizarEtiquetaDispositivo(newChild);
                    node.hijos.push(newChild);
                    return true;
                }
                if (addChildRecursive(node.hijos)) return true;
            }
            return false;
        };
        addChildRecursive(newDispositivos);
        onUpdate(newDispositivos);
        setMenuId(null);
    };

    const handleDelete = (id: string) => {
        const newDispositivos = dispositivos.filter(d => d.id !== id);
        const deleteRecursive = (nodes: Device[]) => {
            for (const node of nodes) {
                node.hijos = node.hijos.filter(h => h.id !== id);
                deleteRecursive(node.hijos);
            }
        };
        if (newDispositivos.length === dispositivos.length) {
            deleteRecursive(newDispositivos);
        }
        onUpdate(newDispositivos);
        setMenuId(null);
    };

    const handleSaveDevice = (updated: Device) => {
        const newDispositivos = [...dispositivos];
        const updateRecursive = (nodes: Device[]) => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === updated.id) {
                    nodes[i] = { ...updated };
                    actualizarEtiquetaDispositivo(nodes[i]);
                    return true;
                }
                if (updateRecursive(nodes[i].hijos)) return true;
            }
            return false;
        };
        updateRecursive(newDispositivos);
        onUpdate(newDispositivos);
        setEditingDevice(null);
    };

    const renderNode = (node: Device, x: number, y: number, level: number) => {
        const isSelected = selectedId === node.id;
        const isIGA = node.etiqueta_texto?.toUpperCase().includes('IGA');

        return (
            <div
                key={node.id}
                className="absolute flex flex-col items-center group transition-all"
                style={{ left: x, top: y, width: SYMBOL_SIZE }}
            >
                {/* Connection Line Above */}
                {level > 0 && <div className="absolute -top-12 left-1/2 w-px h-12 bg-black"></div>}

                {/* Interaction Target */}
                <div
                    className={`relative p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'ring-2 ring-sky-500 bg-sky-500/10' : 'hover:bg-slate-100'}`}
                    onClick={() => {
                        setSelectedId(node.id);
                        setEditingDevice(node);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        handleLongPress(node.id);
                    }}
                >
                    {node.tipo === 'magnetotermico' && <MagnetotermicoSymbol />}
                    {node.tipo === 'diferencial' && <DiferencialSymbol />}
                    {node.tipo === 'final_circuito' && <FinalSymbol />}

                    <span className="absolute left-full ml-2 top-0 whitespace-nowrap text-[10px] font-bold text-black bg-white px-1 border border-slate-200 shadow-sm">
                        {node.etiqueta_texto}
                    </span>
                </div>

                {/* Long-press Menu */}
                {menuId === node.id && (
                    <div className="absolute z-20 top-full mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-1 min-w-[160px] animate-in slide-in-from-top-2">
                        {node.tipo !== 'final_circuito' && (
                            <>
                                <button onClick={() => handleAddChild(node.id, 'magnetotermico')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-md">
                                    + Magnetotérmico
                                </button>
                                <button onClick={() => handleAddChild(node.id, 'diferencial')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-md">
                                    + Diferencial
                                </button>
                                <button onClick={() => handleAddChild(node.id, 'final_circuito')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-md">
                                    Terminar Circuito
                                </button>
                                <div className="h-px bg-slate-800 my-1"></div>
                            </>
                        )}
                        {!isIGA && (
                            <button onClick={() => handleDelete(node.id)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 rounded-md">
                                Eliminar
                            </button>
                        )}
                        <button onClick={() => setMenuId(null)} className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-800 rounded-md">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Children */}
                {node.hijos.length > 0 && (
                    <div className="mt-24 flex gap-4">
                        {node.hijos.map((hijo, idx) => {
                            const childX = (idx - (node.hijos.length - 1) / 2) * HORIZONTAL_GAP;
                            return renderNode(hijo, childX, VERTICAL_GAP, level + 1);
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="relative min-h-[400px] w-full bg-slate-50 border-2 border-slate-200 rounded-xl overflow-auto p-20 cursor-grab active:cursor-grabbing">
            {/* Instructions box - moved to top right and made smaller */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-sm max-w-[200px] z-10 text-left">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Instrucciones</h4>
                <ul className="text-[9px] space-y-1 text-slate-600">
                    <li>• Click: Editar</li>
                    <li>• Click derecho: Añadir</li>
                </ul>
            </div>

            <div className="relative mx-auto" style={{ width: 1 }}>
                {dispositivos.map((d) => renderNode(d, 0, 0, 0))}
            </div>

            {/* Bottom Panel (Refined Layout) */}
            {editingDevice && (
                <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="bg-white border-t border-slate-200 shadow-2xl p-6 rounded-t-3xl max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider text-left">
                                Propiedades: {editingDevice.tipo.replace('_', ' ')}
                            </h3>
                            <button onClick={() => setEditingDevice(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <div className="space-y-4 text-left">
                            {/* Same Row for Poles and Amperage */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Polos</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                        value={editingDevice.num_polos || 2}
                                        onChange={(e) => setEditingDevice({ ...editingDevice!, num_polos: parseInt(e.target.value) })}
                                        disabled={igaPoles === 2}
                                    >
                                        <option value={2}>2P</option>
                                        {igaPoles === 4 && <option value={4}>4P</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Calibre (A)</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                        value={editingDevice.calibre_A || 16}
                                        onChange={(e) => setEditingDevice({ ...editingDevice!, calibre_A: parseInt(e.target.value) })}
                                    >
                                        {[10, 16, 20, 25, 32, 40, 50, 63, 100, 125, 160, 200, 250, 400, 600].map(a => (
                                            <option key={a} value={a}>{a}A</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editingDevice.tipo === 'diferencial' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sensibilidad (mA)</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                            value={editingDevice.sensibilidad_mA || 30}
                                            onChange={(e) => setEditingDevice({ ...editingDevice!, sensibilidad_mA: e.target.value })}
                                        >
                                            <option value={30}>30mA</option>
                                            <option value={300}>300mA</option>
                                            <option value={500}>500mA</option>
                                            <option value="Reg">Regulable</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo ID</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                            value={editingDevice.tipo_diferencial || 'AC'}
                                            onChange={(e) => setEditingDevice({ ...editingDevice!, tipo_diferencial: e.target.value as any })}
                                        >
                                            <option value="AC">AC</option>
                                            <option value="A">A</option>
                                            <option value="F">F</option>
                                            <option value="B">B</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {editingDevice.tipo === 'final_circuito' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Uso del Circuito</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                            value={editingDevice.uso_base || 'Otros'}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditingDevice({
                                                    ...editingDevice!,
                                                    uso_base: val as any,
                                                    nombre_circuito_usuario: val === 'Otros' ? (editingDevice?.nombre_circuito_usuario || '') : null
                                                });
                                            }}
                                        >
                                            <option value="Alumbrado">Alumbrado</option>
                                            <option value="Emergencias">Emergencias</option>
                                            <option value="Otros usos">Otros usos</option>
                                            <option value="Zonas húmedas">Zonas húmedas</option>
                                            <option value="Horno">Horno</option>
                                            <option value="Lavadora">Lavadora</option>
                                            <option value="Lavavajillas">Lavavajillas</option>
                                            <option value="Termo">Termo</option>
                                            <option value="Aire acondicionado">Aire acondicionado</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    {editingDevice.uso_base === 'Otros' && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre Personalizado (Opcional)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                                placeholder="Ej: Tomas terrazo"
                                                value={editingDevice.nombre_circuito_usuario || ''}
                                                onChange={(e) => setEditingDevice({ ...editingDevice!, nombre_circuito_usuario: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => handleSaveDevice(editingDevice!)}
                            className="mt-8 w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg text-sm"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
