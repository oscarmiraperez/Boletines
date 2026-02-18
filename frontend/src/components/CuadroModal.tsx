import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import { API_URL } from '../api';

interface CuadroModalProps {
    isOpen: boolean;
    onClose: () => void;
    cuadroName: string;
    initialData: any;
    onSave: (data: any) => Promise<void>;
}

// Sub-component for individual Differential
const DifferentialItem = ({
    control,
    index,
    remove
}: {
    control: Control<any>,
    index: number,
    remove: (index: number) => void
}) => {
    const inputClass = "block w-full rounded-lg border-slate-700 bg-slate-950/50 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-xs py-2";

    // Nested Field Array for Circuits within this Differential
    const { fields, append, remove: removeCircuit } = useFieldArray({
        control,
        name: `differentials.${index}.circuits`
    });

    return (
        <div className="border border-slate-800 rounded-xl p-4 mb-4 bg-slate-900/50 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-300 text-sm">Diferencial #{index + 1}</h4>
                <button type="button" onClick={() => remove(index)} className="text-red-400 text-xs hover:text-red-300 transition-colors bg-red-500/10 px-2 py-1 rounded">Eliminar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Polos</label>
                    <select {...control.register(`differentials.${index}.poles`, { valueAsNumber: true })} className={inputClass}>
                        <option value="2">2P</option>
                        <option value="4">4P</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Amperaje (A)</label>
                    <select {...control.register(`differentials.${index}.amperage`, { valueAsNumber: true })} className={inputClass}>
                        <option value="25">25 A</option>
                        <option value="40">40 A</option>
                        <option value="63">63 A</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sensibilidad (mA)</label>
                    <select {...control.register(`differentials.${index}.sensitivity`, { valueAsNumber: true })} className={inputClass}>
                        <option value="30">30 mA</option>
                        <option value="300">300 mA</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Descripción / Zona</label>
                    <input {...control.register(`differentials.${index}.description`)} type="text" className={inputClass} placeholder="Ej: General vivienda" />
                </div>
            </div>

            <div className="pl-4 border-l-2 border-sky-500/20 ml-1">
                <h5 className="text-[10px] font-bold text-sky-500 mb-3 uppercase tracking-wider">Circuitos Asociados</h5>

                <div className="space-y-2">
                    {fields.map((circuit, k) => (
                        <div key={circuit.id} className="flex gap-2 items-center bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                            <div className="w-20">
                                <select {...control.register(`differentials.${index}.circuits.${k}.poles`, { valueAsNumber: true })} className="block w-full border-slate-700 bg-slate-900 text-slate-300 rounded text-xs py-1.5 focus:ring-sky-500 focus:border-sky-500">
                                    <option value="2">2P</option>
                                    <option value="4">4P</option>
                                </select>
                            </div>
                            <div className="w-24">
                                <select {...control.register(`differentials.${index}.circuits.${k}.amperage`, { valueAsNumber: true })} className="block w-full border-slate-700 bg-slate-900 text-slate-300 rounded text-xs py-1.5 focus:ring-sky-500 focus:border-sky-500">
                                    <option value="10">10 A</option>
                                    <option value="16">16 A</option>
                                    <option value="20">20 A</option>
                                    <option value="25">25 A</option>
                                    <option value="32">32 A</option>
                                    <option value="40">40 A</option>
                                </select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <select
                                    {...control.register(`differentials.${index}.circuits.${k}.uso_base`)}
                                    className="block w-full border-slate-700 bg-slate-900 text-slate-300 rounded text-xs py-1.5 focus:ring-sky-500 focus:border-sky-500"
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
                                {control._formValues.differentials[index]?.circuits[k]?.uso_base === 'Otros' && (
                                    <input
                                        {...control.register(`differentials.${index}.circuits.${k}.nombre_circuito_usuario`)}
                                        placeholder="Nombre (Tomas terrazo)"
                                        required
                                        className="block w-full border-slate-700 bg-slate-900 text-slate-300 rounded text-xs px-2 py-1.5 placeholder-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    />
                                )}
                            </div>
                            <button type="button" onClick={() => removeCircuit(k)} className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded">×</button>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => append({ poles: 2, amperage: 16, description: '' })}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 mt-3 flex items-center gap-1 py-1 px-2 rounded hover:bg-sky-500/10 transition-colors"
                >
                    <span>+</span> Añadir Circuito
                </button>
            </div>
        </div>
    );
};

export default function CuadroModal({ isOpen, onClose, cuadroName, initialData, onSave }: CuadroModalProps) {
    const { register, control, handleSubmit, reset } = useForm({
        defaultValues: {
            mainBreaker: { poles: 2, amperage: 40 },
            differentials: [] as any[]
        }
    });

    const onSubmit = async (data: any) => {
        await onSave(data);
        onClose();
    };

    const { fields: diffFields, append: appendDiff, remove: removeDiff } = useFieldArray({
        control,
        name: "differentials"
    });

    useEffect(() => {
        if (isOpen && initialData) {
            reset(initialData);
        } else if (isOpen && !initialData) {
            reset({
                mainBreaker: { poles: 2, amperage: 40 },
                differentials: []
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
                                        Configurar Cuadro: <span className="text-sky-400">{cuadroName}</span>
                                    </h3>
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

                                        {/* Left Column: Components */}
                                        <div className="space-y-6">
                                            {/* Main Breaker (IGA) */}
                                            <div className="border-b border-slate-800 pb-4">
                                                <h4 className="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">Interruptor General (IGA)</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Polos</label>
                                                        <select {...register('mainBreaker.poles', { valueAsNumber: true })} className="block w-full rounded-lg border-slate-700 bg-slate-800 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm">
                                                            <option value="2">2P (Monofásico)</option>
                                                            <option value="4">4P (Trifásico)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Amperaje</label>
                                                        <select {...register('mainBreaker.amperage', { valueAsNumber: true })} className="block w-full rounded-lg border-slate-700 bg-slate-800 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm">
                                                            <option value="25">25 A</option>
                                                            <option value="32">32 A</option>
                                                            <option value="40">40 A</option>
                                                            <option value="50">50 A</option>
                                                            <option value="63">63 A</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Differentials List */}
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-semibold text-slate-300 text-sm uppercase tracking-wider">Diferenciales y Circuitos</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => appendDiff({ poles: 2, amperage: 40, sensitivity: 30, circuits: [] })}
                                                        className="inline-flex items-center px-3 py-1.5 border border-sky-500/30 text-xs font-medium rounded-lg text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
                                                    >
                                                        + Añadir Diferencial
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {diffFields.map((field, index) => (
                                                        <DifferentialItem
                                                            key={field.id}
                                                            control={control}
                                                            index={index}
                                                            remove={removeDiff}
                                                        />
                                                    ))}
                                                    {diffFields.length === 0 && (
                                                        <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
                                                            <p className="text-sm text-slate-500">No hay diferenciales configurados.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Photos & Verification */}
                                        <div className="space-y-6">
                                            <h4 className="font-semibold text-slate-300 border-b border-slate-800 pb-2 text-sm uppercase tracking-wider">Estado y Fotos</h4>

                                            {/* Frontal Photo */}
                                            <div className="border border-slate-700 p-4 rounded-xl bg-slate-800/30">
                                                <label className="block text-sm font-medium text-slate-300 mb-3">Foto Frontal (Gabinete cerrado)</label>
                                                {photos.frontal ? (
                                                    <div className="mb-3 relative group rounded-lg overflow-hidden border border-slate-600">
                                                        <img src={`${baseUrl}/uploads/${photos.frontal}`} alt="Frontal" className="w-full h-48 object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById('file-frontal')?.click()}
                                                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                                                        >
                                                            Cambiar Foto
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mb-3 h-48 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 transition-colors cursor-pointer" onClick={() => document.getElementById('file-frontal')?.click()}>
                                                        <span className="text-2xl mb-2">📷</span>
                                                        <span className="text-xs">Subir foto frontal</span>
                                                    </div>
                                                )}
                                                <input
                                                    id="file-frontal"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handlePhotoUpload(e, 'frontal')}
                                                    disabled={uploadingPhoto !== null}
                                                />
                                                {uploadingPhoto === 'frontal' && <p className="text-xs text-sky-400 mt-2 text-center animate-pulse">Subiendo...</p>}
                                            </div>

                                            {/* Interior Photo */}
                                            <div className="border border-slate-700 p-4 rounded-xl bg-slate-800/30">
                                                <label className="block text-sm font-medium text-slate-300 mb-3">Foto Interior (Cableado visible)</label>
                                                {photos.interior ? (
                                                    <div className="mb-3 relative group rounded-lg overflow-hidden border border-slate-600">
                                                        <img src={`${baseUrl}/uploads/${photos.interior}`} alt="Interior" className="w-full h-48 object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById('file-interior')?.click()}
                                                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                                                        >
                                                            Cambiar Foto
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mb-3 h-48 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 transition-colors cursor-pointer" onClick={() => document.getElementById('file-interior')?.click()}>
                                                        <span className="text-2xl mb-2">🔌</span>
                                                        <span className="text-xs">Subir foto interior</span>
                                                    </div>
                                                )}
                                                <input
                                                    id="file-interior"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handlePhotoUpload(e, 'interior')}
                                                    disabled={uploadingPhoto !== null}
                                                />
                                                {uploadingPhoto === 'interior' && <p className="text-xs text-sky-400 mt-2 text-center animate-pulse">Subiendo...</p>}
                                            </div>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-800 gap-2">
                            <button type="submit" className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-500 focus:outline-none sm:w-auto sm:text-sm transition-colors">
                                Guardar Cambios
                            </button>
                            <button type="button" className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-700 shadow-sm px-4 py-2 bg-slate-800 text-base font-medium text-slate-300 hover:bg-slate-700 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors" onClick={onClose}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
