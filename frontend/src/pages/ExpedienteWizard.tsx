import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { cn } from '../lib/utils';


const STEPS = [
    { id: 1, name: 'Datos Trámite' },
    { id: 2, name: 'Titular' },
    { id: 3, name: 'Instalación' },
    { id: 4, name: 'Revisión' }
];

export default function ExpedienteWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData] = useState<any>({
        type: 'ALTA'
        // Add other defaults as needed
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    // const { user } = useAuth(); // Unused

    const { register, handleSubmit, trigger } = useForm({
        defaultValues: { type: 'ALTA', ...formData }, // Ensure type has a default
        mode: 'onBlur'
    });

    // Watch all fields for debug
    // const allValues = watch();

    const nextStep = async () => {
        try {
            let fieldsToValidate: any[] = [];
            if (currentStep === 1) fieldsToValidate = ['type'];
            if (currentStep === 2) fieldsToValidate = ['clientName', 'clientNif', 'clientPhone', 'clientEmail'];
            if (currentStep === 3) fieldsToValidate = [
                'address', 'municipality', 'postalCode',
                'cups', 'contractedPower', 'retailer', 'tariff'
            ];

            const valid = await trigger(fieldsToValidate);

            if (valid) {
                setCurrentStep(prev => {
                    const next = Math.min(prev + 1, STEPS.length);
                    return next;
                });
            } else {
                alert('Faltan datos obligatorios. Revisa los campos marcados.');
            }
        } catch (e: any) {
            alert('Error interno en el asistente: ' + e.message);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const onSubmit = async (data: any) => {
        // If last step
        if (currentStep === STEPS.length) {
            setIsSubmitting(true);
            try {
                const payload = {
                    type: data.type,
                    client: {
                        name: data.clientName,
                        nif: data.clientNif,
                        phone: data.clientPhone,
                        email: data.clientEmail,
                    },
                    installation: {
                        address: data.address,
                        municipality: data.municipality,
                        postalCode: data.postalCode,
                        cups: data.cups,
                        contractedPower: data.contractedPower,
                        retailer: data.retailer,
                        tariff: data.tariff,
                        observations: data.observations
                    }
                };

                const res = await apiRequest('/expedientes', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                // Redirect to detail or authorization step
                navigate(`/expedientes/${res.id}`); // Or to signature step directly?
            } catch (error: any) {
                console.error('Error creating expediente', error);
                // Show detailed error if available
                const errorMessage = error.message || 'Error desconocido';
                // Clean up message if it's the JSON string
                let cleanMessage = errorMessage;
                if (errorMessage.includes('Error setting up expediente')) {
                    cleanMessage = errorMessage; // Or parse if complex
                }
                alert(`Error al crear el expediente:\n${cleanMessage}\n\nRevisa que todos los campos obligatorios (*) estén completos y sean válidos.`);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            nextStep();
        }
    };

    const onError = (errors: any) => {
        console.error('Validation Errors:', errors);
        alert('Hay errores de validación en el formulario. Revisa los campos marcados en rojo en los pasos anteriores.');
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-900/50 shadow-lg shadow-black/40 rounded-lg mt-6 border border-slate-800">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {STEPS.map((step) => (
                        <div key={step.id} className="flex flex-col items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors",
                                step.id === currentStep ? "bg-sky-600" :
                                    step.id < currentStep ? "bg-green-500" : "bg-slate-700 text-slate-400"
                            )}>
                                {step.id}
                            </div>
                            <span className="text-xs mt-1 text-slate-400 font-medium">{step.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} noValidate className="space-y-6">
                {/* Step 1: Datos Trámite */}
                <div className={cn(currentStep === 1 ? "block" : "hidden")}>
                    <h2 className="text-xl font-bold mb-4 text-slate-100">Datos del Trámite</h2>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300">Tipo de Trámite <span className="text-red-400">*</span></label>
                        <select
                            {...register("type", { required: true })}
                            className="mt-1 block w-full py-2 px-3 border border-slate-700 bg-slate-900 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200"
                        >
                            <option value="ALTA">Alta</option>
                            <option value="AMPLIACION">Ampliación</option>
                            <option value="MODIFICACION">Modificación</option>
                            <option value="CAMBIO_TITULAR">Cambio Titular</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">Selecciona el tipo de gestión a realizar.</p>
                    </div>
                </div>

                {/* Step 2: Titular */}
                <div className={cn(currentStep === 2 ? "block" : "hidden")}>
                    <h2 className="text-xl font-bold mb-4 text-slate-100">Datos del Titular</h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-slate-300">Nombre / Razón Social <span className="text-red-400">*</span></label>
                            <input type="text" {...register("clientName", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: Juan Pérez o Empresa SL" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">NIF/CIF <span className="text-red-400">*</span></label>
                            <input type="text" {...register("clientNif", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: 12345678X" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">Teléfono <span className="text-red-400">*</span></label>
                            <input type="text" {...register("clientPhone", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: 600123456" />
                        </div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-slate-300">Email <span className="text-red-400">*</span></label>
                            <input
                                type="email"
                                {...register("clientEmail", {
                                    required: "El email es obligatorio",
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "Email inválido"
                                    }
                                })}
                                className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200"
                                placeholder="Ej: cliente@email.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Step 3: Instalación */}
                <div className={cn(currentStep === 3 ? "block" : "hidden")}>
                    <h2 className="text-xl font-bold mb-4 text-slate-100">Datos de la Instalación</h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-slate-300">Dirección Completa <span className="text-red-400">*</span></label>
                            <input type="text" {...register("address", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Calle, Número, Piso, Puerta" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">Municipio <span className="text-red-400">*</span></label>
                            <input type="text" {...register("municipality", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: San Vicente" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">Código Postal <span className="text-red-400">*</span></label>
                            <input type="text" {...register("postalCode", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: 03690" />
                        </div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-slate-300">CUPS <span className="text-red-400">*</span></label>
                            <input type="text" {...register("cups", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="ES0021..." />
                            <p className="mt-1 text-xs text-slate-500">Código Universal del Punto de Suministro (20-22 caracteres).</p>
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">Potencia (kW) <span className="text-red-400">*</span></label>
                            <input type="number" step="any" {...register("contractedPower", { required: true, valueAsNumber: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: 5.75" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">Distribuidora (Alicante/Valencia) <span className="text-red-400">*</span></label>
                            <select {...register("distributor", { required: true })} className="mt-1 block w-full py-2 px-3 border border-slate-700 bg-slate-900 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200">
                                <option value="">-- Seleccionar --</option>
                                <option value="i-DE Redes Eléctricas Inteligentes (Iberdrola)">i-DE (Iberdrola)</option>
                                <option value="UFD Distribución Electricidad (Naturgy)">UFD (Naturgy)</option>
                                <option value="E-Distribución (Endesa)">E-Distribución (Endesa)</option>
                                <option value="Otra">Otra</option>
                            </select>
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-300">Comercializadora <span className="text-red-400">*</span></label>
                            <input type="text" {...register("retailer", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: Iberdrola Clientes" />
                        </div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-slate-300">Tarifa <span className="text-red-400">*</span></label>
                            <input type="text" {...register("tariff", { required: true })} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Ej: 2.0TD" />
                        </div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-slate-300">Observaciones</label>
                            <textarea {...register("observations")} className="mt-1 block w-full border border-slate-700 bg-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-200" placeholder="Comentarios adicionales opcionales..." />
                        </div>
                    </div>
                </div>

                {/* Step 4: Revisión */}
                <div className={cn(currentStep === 4 ? "block" : "hidden")}>
                    <h2 className="text-xl font-bold mb-4 text-slate-100">Revisión</h2>
                    <p className="text-slate-400 mb-4">Por favor revisa que todos los datos sean correctos antes de crear el expediente.</p>
                    {/* Simple summary of data can go here */}
                    <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-sm text-slate-300">
                        <p>Los datos se guardarán y podrás añadir la firma y datos técnicos en la siguiente pantalla.</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-between">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="bg-slate-800 py-2 px-4 border border-slate-700 rounded-lg shadow-sm text-sm font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                        >
                            Atrás
                        </button>
                    ) : <div></div>}

                    {currentStep < STEPS.length ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={
                                cn(
                                    "ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
                                    isSubmitting ? "bg-slate-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"
                                )}
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Expediente'}
                        </button>
                    )}
                </div>
            </form>

        </div>
    );
}
