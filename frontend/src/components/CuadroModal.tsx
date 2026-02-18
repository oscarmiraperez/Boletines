import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Control, UseFormRegister } from 'react-hook-form';
import { API_URL } from '../api';

interface CuadroModalProps {
    isOpen: boolean;
    onClose: () => void;
    cuadroName: string;
    initialData: any;
    onSave: (data: any) => Promise<void>;
}

// Sub-component for individual Magnetothermic (Standalone)
const PiaItem = ({
    register,
    index,
    remove
}: {
    register: UseFormRegister<any>,
    index: number,
    remove: (index: number) => void
}) => {
    const inputClass = "block w-full rounded-lg border-slate-700 bg-slate-950/50 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-xs py-2 px-2";

    return (
        <div className="border border-slate-800 rounded-xl p-4 mb-4 bg-slate-900/50 shadow-sm border-l-4 border-l-slate-600">
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    Circuito Pendiente / Magnetotérmico (PIA)
                </h4>
                <button type="button" onClick={() => remove(index)} className="text-red-400 text-xs hover:text-red-300 transition-colors bg-red-500/10 px-2 py-1 rounded">Eliminar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Polos</label>
                        <select {...register(`components.${index}.poles`, { valueAsNumber: true })} className={inputClass}>
                            <option value="2">2P</option>
                            <option value="4">4P</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amperaje (A)</label>
                        <select {...register(`components.${index}.amperage`, { valueAsNumber: true })} className={inputClass}>
                            {[10, 16, 20, 25, 32, 40, 50, 63, 100].map(a => (
                                <option key={a} value={a}>{a} A</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Uso / Aplicación</label>
                    <select {...register(`components.${index}.uso_base`)} className={inputClass}>
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
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Personalizado (Opcional)</label>
                    <input
                        {...register(`components.${index}.nombre_circuito_usuario`)}
                        type="text"
                        className={inputClass}
                        placeholder="Ej: Tomas Terraza"
                    />
                </div>
            </div>
        </div>
    );
};

// Sub-component for individual Differential
const DifferentialItem = ({
    register,
    control,
    index,
    remove
}: {
    register: UseFormRegister<any>,
    control: Control<any>,
    index: number,
    remove: (index: number) => void
}) => {
    const inputClass = "block w-full rounded-lg border-slate-700 bg-slate-950/50 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-xs py-2 px-2";

    // Nested Field Array for Circuits within this Differential
    const { fields, append, remove: removeCircuit } = useFieldArray({
        control,
        name: `components.${index}.circuits`
    });

    return (
        <div className="border border-slate-800 rounded-xl p-4 mb-4 bg-slate-900/50 shadow-sm border-l-4 border-l-sky-600">
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Bloque Diferencial (ID)
                </h4>
                <button type="button" onClick={() => remove(index)} className="text-red-400 text-xs hover:text-red-300 transition-colors bg-red-500/10 px-2 py-1 rounded">Eliminar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Polos</label>
                    <select {...register(`components.${index}.poles`, { valueAsNumber: true })} className={inputClass}>
                        <option value="2">2P</option>
                        <option value="4">4P</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amperaje (A)</label>
                    <select {...register(`components.${index}.amperage`, { valueAsNumber: true })} className={inputClass}>
                        <option value="25">25 A</option>
                        <option value="40">40 A</option>
                        <option value="63">63 A</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sensibilidad (mA)</label>
                    <select {...register(`components.${index}.sensitivity`, { valueAsNumber: true })} className={inputClass}>
                        <option value="30">30 mA</option>
                        <option value="300">300 mA</option>
                    </select>
                </div>
            </div>

            <div className="pl-4 border-l-2 border-sky-500/20 ml-1">
                <h5 className="text-[10px] font-bold text-sky-500 mb-3 uppercase tracking-wider">Circuitos Protegidos</h5>

                <div className="space-y-2">
                    {fields.map((circuit, k) => (
                        <div key={circuit.id} className="flex gap-2 items-start bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                            <div className="w-16">
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Polos</label>
                                <select {...register(`components.${index}.circuits.${k}.poles`, { valueAsNumber: true })} className="block w-full border-slate-700 bg-slate-900 text-slate-300 rounded text-[10px] py-1 focus:ring-sky-500 focus:border-sky-500">
                                    <option value="2">2P</option>
                                    <option value="4">4P</option>
                                </select>
                            </div>
                            <div className="w-20">
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Amp.</label>
                                <select {...register(`components.${index}.circuits.${k}.amperage`, { valueAsNumber: true })} className="block w-full border-slate-700 bg-slate-900 text-slate-300 rounded text-[10px] py-1 focus:ring-sky-500 focus:border-sky-500">
                                    {[10, 16, 20, 25, 32, 40].map(a => <option key={a} value={a}>{a}A</option>)}
                                </select>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Uso y Nombre</label>
                                <div className="flex gap-1">
                                    <select
                                        {...register(`components.${index}.circuits.${k}.uso_base`)}
                                        className="block flex-1 border-slate-700 bg-slate-900 text-slate-300 rounded text-[10px] py-1 focus:ring-sky-500 focus:border-sky-500"
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
                                    <input
                                        {...register(`components.${index}.circuits.${k}.nombre_circuito_usuario`)}
                                        placeholder="Opcional"
                                        className="block flex-1 border-slate-700 bg-slate-900 text-slate-300 rounded text-[10px] px-2 py-1 placeholder-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    />
                                </div>
                            </div>
                            <button type="button" onClick={() => removeCircuit(k)} className="text-slate-500 hover:text-red-400 mt-4 transition-colors p-1 hover:bg-red-500/10 rounded">×</button>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => append({ poles: 2, amperage: 16, uso_base: 'Otros' })}
                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 mt-3 flex items-center gap-1 py-1 px-2 rounded hover:bg-sky-500/10 transition-colors"
                >
                    <span>+</span> Añadir Circuito al ID
                </button>
            </div>
        </div>
    );
};

export default function CuadroModal({ isOpen, onClose, cuadroName, initialData, onSave }: CuadroModalProps) {
    const { register, control, handleSubmit, reset } = useForm({
        defaultValues: {
            mainBreaker: { poles: 2, amperage: 40 },
            components: [] as any[]
        }
    });

    const onSubmit = async (data: any) => {
        await onSave(data);
        onClose();
    };

    const { fields, append, remove } = useFieldArray({
        control,
        name: "components"
    });

    useEffect(() => {
        if (isOpen && initialData) {
            // Map 'differentials' array to 'components' array for backward compatibility
            const data = { ...initialData };
            if (!data.components && data.differentials) {
                data.components = data.differentials.map((d: any) => ({
                    ...d,
                    tipo: 'ID'
                }));
            }
            reset(data);
        } else if (isOpen && !initialData) {
            reset({
                mainBreaker: { poles: 2, amperage: 40 },
                components: []
            });
        }
    }, [isOpen, initialData, reset]);

    const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
    const [photos, setPhotos] = useState<{ frontal: string | null, interior: string | null }>({ frontal: null, interior: null });

    useEffect(() => {
        if (initialData) {
            setPhotos({
                frontal: initialData.photoFrontal || null,
                interior: initialData.photoInterior || null
            });
        }
    }, [initialData]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'frontal' | 'interior') => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        if (!initialData?.id) {
            alert('Error: No se puede subir foto sin ID de cuadro');
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('type', type);

        setUploadingPhoto(type);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/technical/cuadros/${initialData.id}/photos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Error subiendo foto');

            const result = await response.json();
            setPhotos(prev => ({ ...prev, [type]: result.filename }));
        } catch (error) {
            console.error(error);
            alert('Error al subir la foto');
        } finally {
            setUploadingPhoto(null);
        }
    };

    if (!isOpen) return null;

    const baseUrl = window.location.origin;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-slate-900 border border-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-xl leading-6 font-bold text-slate-100 mb-6" id="modal-title">
                                        Configuración del Cuadro: <span className="text-sky-400">{cuadroName}</span>
                                    </h3>
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

                                        {/* Left Column: Components List */}
                                        <div className="space-y-6">
                                            {/* Top Section: IGA */}
                                            <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-xl">
                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cabecera: Interruptor General (IGA)</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Polos</label>
                                                        <select {...register('mainBreaker.poles', { valueAsNumber: true })} className="block w-full rounded-lg border-slate-700 bg-slate-800 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm py-2">
                                                            <option value="2">2P (Monofásico)</option>
                                                            <option value="4">4P (Trifásico)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Amperaje</label>
                                                        <select {...register('mainBreaker.amperage', { valueAsNumber: true })} className="block w-full rounded-lg border-slate-700 bg-slate-800 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm py-2">
                                                            {[25, 32, 40, 50, 63, 100].map(a => <option key={a} value={a}>{a} A</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic Components List */}
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distribución de Protecciones</h4>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => append({ tipo: 'ID', poles: 2, amperage: 40, sensitivity: 30, circuits: [] })}
                                                            className="text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-1.5 rounded uppercase hover:bg-sky-500/20 transition-all"
                                                        >
                                                            + Diferencial
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => append({ tipo: 'PIA', poles: 2, amperage: 16, uso_base: 'Otros' })}
                                                            className="text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1.5 rounded uppercase hover:bg-slate-700 transition-all"
                                                        >
                                                            + Magnetotérmico
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    {fields.map((field: any, index) => (
                                                        field.tipo === 'ID' ? (
                                                            <DifferentialItem key={field.id} register={register} control={control} index={index} remove={remove} />
                                                        ) : (
                                                            <PiaItem key={field.id} register={register} index={index} remove={remove} />
                                                        )
                                                    ))}
                                                    {fields.length === 0 && (
                                                        <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
                                                            <p className="text-sm text-slate-600">No has añadido protecciones todavía.</p>
                                                            <p className="text-[10px] text-slate-700 uppercase tracking-tighter mt-1 italic">Usa los botones superiores para empezar</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Photos & Extras */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Documentación Gráfica</h4>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="border border-slate-800 p-4 rounded-xl bg-slate-950/20">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Foto Frontal</label>
                                                    {photos.frontal ? (
                                                        <div className="relative group rounded-lg overflow-hidden border border-slate-800 h-40">
                                                            <img src={`${baseUrl}/uploads/${photos.frontal}`} alt="Frontal" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button type="button" onClick={() => document.getElementById('file-frontal')?.click()} className="text-white text-xs font-bold bg-sky-600 px-4 py-2 rounded-full shadow-lg">Cambiar Foto</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-40 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-600 bg-slate-900/10 transition-colors cursor-pointer" onClick={() => document.getElementById('file-frontal')?.click()}>
                                                            <span className="text-xl mb-1">📸</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter">Subir Frontal</span>
                                                        </div>
                                                    )}
                                                    <input id="file-frontal" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'frontal')} disabled={!!uploadingPhoto} />
                                                </div>

                                                <div className="border border-slate-800 p-4 rounded-xl bg-slate-950/20">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Foto Interior (Cableado)</label>
                                                    {photos.interior ? (
                                                        <div className="relative group rounded-lg overflow-hidden border border-slate-800 h-40">
                                                            <img src={`${baseUrl}/uploads/${photos.interior}`} alt="Interior" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button type="button" onClick={() => document.getElementById('file-interior')?.click()} className="text-white text-xs font-bold bg-sky-600 px-4 py-2 rounded-full shadow-lg">Cambiar Foto</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-40 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-600 bg-slate-900/10 transition-colors cursor-pointer" onClick={() => document.getElementById('file-interior')?.click()}>
                                                            <span className="text-xl mb-1">🔌</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter">Subir Interior</span>
                                                        </div>
                                                    )}
                                                    <input id="file-interior" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'interior')} disabled={!!uploadingPhoto} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row-reverse border-t border-slate-800 gap-3">
                            <button type="submit" className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-900/40">
                                Guardar Configuración
                            </button>
                            <button type="button" className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-3 rounded-xl transition-all" onClick={onClose}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
