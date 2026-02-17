import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, API_URL } from '../api';
import CuadroModal from '../components/CuadroModal';

// Simplified for brevity, normally split into sub-components
export default function TechnicalForms() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // We'll manage multiple sections here or tabs.
    // Medida y Tierra Form (stored in mtdData)
    const { register: registerMtd, handleSubmit: submitMtd, reset: resetMtd } = useForm();



    const [activeTab, setActiveTab] = useState('general');

    // Cuadros Form is complex because it's 1-to-many. 
    // Let's handle Cuadros as a list, and editing one cuadro opens a modal or separate view.
    // For now, let's just list cuadros and have a "Add Cuadro" button.
    const [cuadros, setCuadros] = useState<any[]>([]);

    // Verificaciones Form
    const { register: registerVerif, handleSubmit: submitVerif, reset: resetVerif } = useForm();

    useEffect(() => {
        fetchTechnicalData();
    }, [id]);

    const fetchTechnicalData = async () => {
        try {
            const data = await apiRequest(`/expedientes/${id}`);
            if (data.cuadros) setCuadros(data.cuadros);
            if (data.verificaciones) resetVerif(data.verificaciones);

            // Load MTD Data (General, Enlace, Medida, Tierra all go to mtdData)
            const mtd = data.mtdData || {};

            // Pre-fill with Expediente data if empty
            if (!mtd.titularNombre && data.installation?.client?.name) mtd.titularNombre = data.installation.client.name;
            if (!mtd.titularNif && data.installation?.client?.nif) mtd.titularNif = data.installation.client.nif;
            if (!mtd.direccion && data.installation?.address) mtd.direccion = data.installation.address;
            if (!mtd.potenciaPrevista && data.installation?.contractedPower) mtd.potenciaPrevista = data.installation.contractedPower;
            if (!mtd.tensionNominal) mtd.tensionNominal = '230'; // Default
            if (!mtd.usoInstalacion) mtd.usoInstalacion = 'vivienda'; // Default

            resetMtd(mtd);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };



    const onSaveVerificaciones = async (data: any) => {
        try {
            await apiRequest(`/technical/expedientes/${id}/verificaciones`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            alert('Verificaciones guardadas');
        } catch (error) {
            alert('Error guardando verificaciones');
        }
    };

    const onSaveMtd = async (data: any) => {
        try {
            // We update the expediente with mtdData
            await apiRequest(`/expedientes/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ mtdData: data })
            });
            alert('Datos de Medida y Tierra guardados');
        } catch (error) {
            console.error(error);
            alert('Error guardando datos');
        }
    };

    const deleteCuadro = async (cuadroId: string) => {
        if (!confirm('¿Seguro que quieres borrar este cuadro?')) return;
        try {
            await apiRequest(`/technical/cuadros/${cuadroId}`, { method: 'DELETE' });
            fetchTechnicalData();
        } catch (error) {
            alert('Error borrando cuadro');
        }
    };


    const [editingCuadro, setEditingCuadro] = useState<any>(null);

    // ... existing onSave functions

    const onSaveCuadroComponents = async (data: any) => {
        if (!editingCuadro) return;
        try {
            await apiRequest(`/technical/cuadros/${editingCuadro.id}/components`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            alert('Componentes guardados');
            setEditingCuadro(null);
            fetchTechnicalData();
        } catch (error) {
            console.error(error);
            alert('Error guardando componentes');
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="bg-white shadow sm:rounded-lg p-4">
            <CuadroModal
                isOpen={!!editingCuadro}
                onClose={() => setEditingCuadro(null)}
                cuadroName={editingCuadro?.name || ''}
                initialData={editingCuadro}
                onSave={onSaveCuadroComponents}
            />

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {[
                        { id: 'general', name: 'Datos Generales' },
                        { id: 'enlace', name: 'Enlace y Acometida' },
                        { id: 'medida', name: 'Medida y Tierra' },
                        { id: 'derivacion', name: 'Derivación Ind.' },
                        { id: 'cuadros', name: 'Cuadros y Circuitos' },
                        { id: 'verificaciones', name: 'Verificaciones' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* General Data Tab */}
            {activeTab === 'general' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                        <div className="md:grid md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-1">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Datos Generales</h3>
                                <p className="mt-1 text-sm text-gray-500">Información administrativa y general de la instalación.</p>
                            </div>
                            <div className="mt-5 md:mt-0 md:col-span-2">
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Titular (Nombre/Razón Social)</label>
                                        <input {...registerMtd('titularNombre')} placeholder="Heredado del expediente si vacío" type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">NIF / CIF</label>
                                        <input {...registerMtd('titularNif')} placeholder="Heredado del expediente si vacío" type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Representante (Nombre)</label>
                                        <input {...registerMtd('representanteNombre')} type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">DNI Representante</label>
                                        <input {...registerMtd('representanteDni')} type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-4">
                                        <label className="block text-sm font-medium text-gray-700">Emplazamiento (Dirección)</label>
                                        <input {...registerMtd('direccion')} placeholder="Heredado del expediente si vacío" type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Referencia Catastral</label>
                                        <input {...registerMtd('refCatastral')} type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Uso de la Instalación</label>
                                        <select {...registerMtd('usoInstalacion')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="">-- Seleccionar --</option>
                                            <option value="vivienda">Vivienda</option>
                                            <option value="local_publica_concurrencia">Local Pública Concurrencia</option>
                                            <option value="local_industrial">Industrial</option>
                                            <option value="comun_edificio">Servicios Comunes Edificio</option>
                                            <option value="garaje">Garaje</option>
                                            <option value="alumbrado_exterior">Alumbrado Exterior</option>
                                            <option value="otros">Otros</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Superficie (m²)</label>
                                        <input {...registerMtd('superficie')} type="number" step="0.01" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Potencia Prevista (kW)</label>
                                        <input {...registerMtd('potenciaPrevista')} type="number" step="0.01" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Tensión (V)</label>
                                        <select {...registerMtd('tensionNominal')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="230">230 V (Monofásica)</option>
                                            <option value="400">400 V (Trifásica)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-5">
                                    <button onClick={submitMtd(onSaveMtd)} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Guardar General
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enlace Tab */}
            {activeTab === 'enlace' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                        <div className="md:grid md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-1">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Enlace y Acometida</h3>
                                <p className="mt-1 text-sm text-gray-500">Configuración de la acometida, caja general y línea general de alimentación.</p>
                            </div>
                            <div className="mt-5 md:mt-0 md:col-span-2">
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Tipo de Acometida</label>
                                        <select {...registerMtd('acometidaTipo')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="">-- Seleccionar --</option>
                                            <option value="aerea_posada">Aérea Posada</option>
                                            <option value="aerea_tensada">Aérea Tensada</option>
                                            <option value="subterranea">Subterránea</option>
                                            <option value="areo_subterranea">Aéreo-Subterránea</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Punto de Conexión</label>
                                        <input {...registerMtd('acometidaPuntoConexion')} placeholder="Ej: Poste, Caja, Arqueta..." type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>

                                    <div className="sm:col-span-6 mt-4 mb-2">
                                        <h5 className="text-md font-medium text-gray-800 border-b border-dashed pb-1">Caja General de Protección (CGP)</h5>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Ubicación CGP (Emplazamiento)</label>
                                        <input list="cgpUbicacionOptions" {...registerMtd('cgpUbicacion')} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                        <datalist id="cgpUbicacionOptions">
                                            <option value="Fachada" />
                                            <option value="Nicho en pared" />
                                            <option value="Interior Zona Común" />
                                        </datalist>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Esquema / Modelo</label>
                                        <input {...registerMtd('cgpEsquema')} placeholder="Ej: 7 (Buc o similar)" type="text" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Intensidad (A)</label>
                                        <input {...registerMtd('cgpIntensidad')} type="number" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>

                                    <div className="sm:col-span-6 mt-4 mb-2">
                                        <h5 className="text-md font-medium text-gray-800 border-b border-dashed pb-1">Línea General de Alimentación (LGA)</h5>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Material</label>
                                        <select {...registerMtd('lgaMaterial')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="cu">Cobre (Cu)</option>
                                            <option value="al">Aluminio (Al)</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Sección (mm²)</label>
                                        <input {...registerMtd('lgaSeccion')} type="number" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Aislamiento</label>
                                        <select {...registerMtd('lgaAislamiento')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="">-- Seleccionar --</option>
                                            <option value="450/750 V">450/750 V</option>
                                            <option value="0.6/1 kV">0.6/1 kV</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Instalación</label>
                                        <select {...registerMtd('lgaInstalacion')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="tubo_empotrado">Bajo tubo empotrado</option>
                                            <option value="tubo_superficie">Bajo tubo superficie</option>
                                            <option value="canaladura">Canaladura</option>
                                            <option value="enterrado">Enterrado</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Diámetro Tubo (mm)</label>
                                        <input {...registerMtd('lgaDiametroTubo')} type="number" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                </div>
                                <div className="mt-5">
                                    <button onClick={submitMtd(onSaveMtd)} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Guardar Enlace
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'derivacion' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                        <div className="md:grid md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-1">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Derivación Individual</h3>
                                <p className="mt-1 text-sm text-gray-500">Características de la Derivación Individual (DI).</p>
                            </div>
                            <div className="mt-5 md:mt-0 md:col-span-2">
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Material</label>
                                        <select {...registerMtd('diMaterial')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="cu">Cobre (Cu)</option>
                                            <option value="al">Aluminio (Al)</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Sección (mm²)</label>
                                        <input {...registerMtd('diSeccion')} type="number" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Aislamiento</label>
                                        <select {...registerMtd('diAislamiento')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="">-- Seleccionar --</option>
                                            <option value="450/750 V">450/750 V</option>
                                            <option value="0.6/1 kV">0.6/1 kV</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Instalación</label>
                                        <select {...registerMtd('diInstalacion')} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="tubo_empotrado">Bajo tubo empotrado</option>
                                            <option value="tubo_superficie">Bajo tubo superficie</option>
                                            <option value="canaladura">Canaladura</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Diámetro Tubo (mm)</label>
                                        <input {...registerMtd('diDiametroTubo')} type="number" className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">H.F. (Libre Halógenos)</label>
                                        <div className="mt-2">
                                            <label className="inline-flex items-center">
                                                <input type="checkbox" {...registerMtd('diLibreHalogenos')} className="form-checkbox h-4 w-4 text-blue-600" />
                                                <span className="ml-2">Sí</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5">
                                    <button onClick={submitMtd(onSaveMtd)} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Guardar Derivación
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'medida' && (
                <form onSubmit={submitMtd(onSaveMtd)} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Medida (Contadores)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Situación</label>
                                <select {...registerMtd('medidaSituacion')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                    <option value="individual_unico_usuario">Individual Único Usuario</option>
                                    <option value="concentracion_contadores">Concentración de Contadores</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                                <input type="text" {...registerMtd('medidaUbicacion')} placeholder="Ej: Fachada, Nicho" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sistema</label>
                                <select {...registerMtd('medidaSistema')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                    <option value="directa">Directa</option>
                                    <option value="indirecta">Indirecta</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Puesta a Tierra</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Electrodo</label>
                                <select {...registerMtd('tierraElectrodo')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                    <option value="Picas">Picas</option>
                                    <option value="Placas">Placas</option>
                                    <option value="Conductor Enterrado">Conductor Enterrado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Resistencia Tierra (Ω)</label>
                                <input type="number" step="0.01" {...registerMtd('tierraResistencia')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Puntos de Puesta a Tierra</label>
                                <input type="text" {...registerMtd('tierraPuntos')} placeholder="Ej: 1" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sección (mm²)</label>
                                <input type="number" step="0.1" {...registerMtd('tierraSeccion', { valueAsNumber: true })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Guardar Datos Medida y Tierra</button>
                </form>
            )}

            {activeTab === 'cuadros' && (
                <div>
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-medium">Cuadros Eléctricos</h3>
                        <div className="space-x-4">
                            <button
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        if (!token) {
                                            alert('No hay sesión activa. Por favor, inicia sesión.');
                                            return;
                                        }

                                        const response = await fetch(`${API_URL}/documents/expedientes/${id}/schematic/generate`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });

                                        if (response.status === 401 || response.status === 403) {
                                            alert('Tu sesión ha expirado o el token es inválido. Por favor, cierra sesión y vuelve a entrar.');
                                            return;
                                        }

                                        if (!response.ok) throw new Error('Error generando esquema');

                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `esquema-${id}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                    } catch (error) {
                                        console.error('Download error:', error);
                                        alert('Error al descargar el esquema (ver consola).');
                                    }
                                }}
                                className="text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded border border-indigo-200"
                            >
                                📄 Descargar Esquema
                            </button>
                            <button
                                onClick={async () => {
                                    const name = prompt('Nombre del cuadro (Ej: General Vivienda)');
                                    if (name) {
                                        await apiRequest(`/technical/expedientes/${id}/cuadros`, {
                                            method: 'POST',
                                            body: JSON.stringify({ name, description: '' })
                                        });
                                        fetchTechnicalData();
                                    }
                                }}
                                className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                            >
                                + Añadir Cuadro
                            </button>
                        </div>
                    </div>

                    <ul className="space-y-2">
                        {cuadros.map((cuadro: any) => (
                            <li key={cuadro.id} className="border p-3 rounded flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <span className="font-medium block">{cuadro.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {cuadro.mainBreaker ? `IGA: ${cuadro.mainBreaker.amperage}A` : 'Sin configurar'} •
                                        {cuadro.differentials ? ` ${cuadro.differentials.length} Diferenciales` : ' 0 Diferenciales'}
                                    </span>
                                </div>
                                <div className="space-x-2">
                                    <button onClick={() => setEditingCuadro(cuadro)} className="text-blue-600 text-sm font-medium hover:text-blue-800">Editar Componentes</button>
                                    <button onClick={() => deleteCuadro(cuadro.id)} className="text-red-600 text-sm hover:text-red-800">Borrar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {activeTab === 'verificaciones' && (
                <form onSubmit={submitVerif(onSaveVerificaciones)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Continuidad</label>
                            <select {...registerVerif('continuity')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                <option value="CORRECTO">Correcto</option>
                                <option value="NO_CORRECTO">No Correcto</option>
                                <option value="NO_APLICA">No Aplica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Aislamiento</label>
                            <select {...registerVerif('insulation')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                <option value="CORRECTO">Correcto</option>
                                <option value="NO_CORRECTO">No Correcto</option>
                                <option value="NO_APLICA">No Aplica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Resistencia Tierra (Ω)</label>
                            <input type="number" step="0.01" {...registerVerif('earthResistance')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Disparo Diferenciales</label>
                            <select {...registerVerif('differentialTrip')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                <option value="CORRECTO">Correcto</option>
                                <option value="NO_CORRECTO">No Correcto</option>
                                <option value="NO_APLICA">No Aplica</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
                </form>
            )}

            <div className="mt-8 border-t pt-4">
                <button onClick={() => navigate(`/expedientes/${id}`)} className="text-gray-500">
                    ← Volver al Expediente
                </button>
            </div>
        </div>
    );
}
