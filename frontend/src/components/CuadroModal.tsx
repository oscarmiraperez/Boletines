import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Control } from 'react-hook-form';

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
    // Nested Field Array for Circuits within this Differential
    const { fields, append, remove: removeCircuit } = useFieldArray({
        control,
        name: `differentials.${index}.circuits`
    });

    return (
        <div className="border border-gray-200 rounded p-4 mb-4 bg-white shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-700">Diferencial #{index + 1}</h4>
                <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm hover:underline">Eliminar Diferencial</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500">Polos</label>
                    <select {...control.register(`differentials.${index}.poles`, { valueAsNumber: true })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm">
                        <option value="2">2P</option>
                        <option value="4">4P</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500">Amperaje (A)</label>
                    <select {...control.register(`differentials.${index}.amperage`, { valueAsNumber: true })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm">
                        <option value="25">25 A</option>
                        <option value="40">40 A</option>
                        <option value="63">63 A</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500">Sensibilidad (mA)</label>
                    <select {...control.register(`differentials.${index}.sensitivity`, { valueAsNumber: true })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm">
                        <option value="30">30 mA</option>
                        <option value="300">300 mA</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-500">Descripción / Zona</label>
                    <input {...control.register(`differentials.${index}.description`)} type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="Ej: General vivienda" />
                </div>
            </div>

            <div className="pl-4 border-l-2 border-blue-200">
                <h5 className="text-sm font-medium text-gray-600 mb-2">Circuitos (Magnetotérmicos)</h5>

                {fields.map((circuit, k) => (
                    <div key={circuit.id} className="flex gap-2 mb-2 items-center bg-white p-2 rounded shadow-sm">
                        <div className="w-20">
                            <select {...control.register(`differentials.${index}.circuits.${k}.poles`, { valueAsNumber: true })} className="block w-full border border-gray-300 rounded text-xs">
                                <option value="2">2P</option>
                                <option value="4">4P</option>
                            </select>
                        </div>
                        <div className="w-24">
                            <select {...control.register(`differentials.${index}.circuits.${k}.amperage`, { valueAsNumber: true })} className="block w-full border border-gray-300 rounded text-xs">
                                <option value="10">10 A</option>
                                <option value="16">16 A</option>
                                <option value="20">20 A</option>
                                <option value="25">25 A</option>
                                <option value="32">32 A</option>
                                <option value="40">40 A</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <input {...control.register(`differentials.${index}.circuits.${k}.description`)} placeholder="Uso (Ej: Alumbrado)" className="block w-full border border-gray-300 rounded text-xs px-2 py-1" />
                        </div>
                        <button type="button" onClick={() => removeCircuit(k)} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => append({ poles: 2, amperage: 16, description: '' })}
                    className="text-xs text-blue-600 hover:underline mt-1"
                >
                    + Añadir Circuito
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
            // Transform initialData to match form structure if necessary
            // Assuming initialData comes in correctly structured from parent
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
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/technical/cuadros/${initialData.id}/photos`, {
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
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Configurar Cuadro: {cuadroName}
                                    </h3>
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2">

                                        {/* Left Column: Components */}
                                        <div className="space-y-6">
                                            {/* Main Breaker (IGA) */}
                                            <div className="border-b pb-4">
                                                <h4 className="font-medium text-gray-800 mb-2">Interruptor General Automático (IGA)</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Polos</label>
                                                        <select {...register('mainBreaker.poles', { valueAsNumber: true })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                                            <option value="2">2P (Monofásico)</option>
                                                            <option value="4">4P (Trifásico)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Amperaje</label>
                                                        <select {...register('mainBreaker.amperage', { valueAsNumber: true })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
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
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-medium text-gray-800">Diferenciales y Circuitos</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => appendDiff({ poles: 2, amperage: 40, sensitivity: 30, circuits: [] })}
                                                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
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
                                                        <p className="text-sm text-gray-500 italic text-center py-4">No hay diferenciales configurados.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Photos & Verification */}
                                        <div className="space-y-6">
                                            <h4 className="font-medium text-gray-800 border-b pb-2">Estado y Fotos</h4>

                                            {/* Frontal Photo */}
                                            <div className="border p-4 rounded bg-white shadow-sm">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Frontal (Gabinete cerrado)</label>
                                                {photos.frontal ? (
                                                    <div className="mb-2 relative group">
                                                        <img src={`${baseUrl}/uploads/${photos.frontal}`} alt="Frontal" className="w-full h-48 object-cover rounded border" />
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById('file-frontal')?.click()}
                                                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            Cambiar Foto
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mb-2 h-48 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                                                        Sin foto
                                                    </div>
                                                )}
                                                <input
                                                    id="file-frontal"
                                                    type="file"
                                                    accept="image/*"
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    onChange={(e) => handlePhotoUpload(e, 'frontal')}
                                                    disabled={uploadingPhoto !== null}
                                                />
                                                {uploadingPhoto === 'frontal' && <p className="text-xs text-blue-500 mt-1">Subiendo...</p>}
                                            </div>

                                            {/* Interior Photo */}
                                            <div className="border p-4 rounded bg-white shadow-sm">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Interior (Cableado visible)</label>
                                                {photos.interior ? (
                                                    <div className="mb-2 relative group">
                                                        <img src={`${baseUrl}/uploads/${photos.interior}`} alt="Interior" className="w-full h-48 object-cover rounded border" />
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById('file-interior')?.click()}
                                                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            Cambiar Foto
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mb-2 h-48 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                                                        Sin foto
                                                    </div>
                                                )}
                                                <input
                                                    id="file-interior"
                                                    type="file"
                                                    accept="image/*"
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    onChange={(e) => handlePhotoUpload(e, 'interior')}
                                                    disabled={uploadingPhoto !== null}
                                                />
                                                {uploadingPhoto === 'interior' && <p className="text-xs text-blue-500 mt-1">Subiendo...</p>}
                                            </div>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100">
                            <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                                Guardar Cambios
                            </button>
                            <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={onClose}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
