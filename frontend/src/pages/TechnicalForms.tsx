import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { apiRequest, API_URL } from '../api';
import CuadroModal from '../components/CuadroModal';

interface TechnicalFormsProps {
    initialData?: any;
    onSaveMtd?: (data: any) => Promise<void>;
    onSaveVerificaciones?: (data: any) => Promise<void>;
    onDeleteCuadro?: (id: string) => Promise<void>;
    onSaveCuadroComponents?: (id: string, data: any) => Promise<void>;
    onCreateCuadro?: (name: string) => Promise<void>;
    onGenerateSchematic?: () => Promise<void>;
    standalone?: boolean; // If true, fetched data is handled by parent or different logic
}

export default function TechnicalForms({
    initialData,
    onSaveMtd: parentSaveMtd,
    onSaveVerificaciones: parentSaveVerif,
    onDeleteCuadro: parentDeleteCuadro,
    onSaveCuadroComponents: parentSaveCuadroComponents,
    onCreateCuadro: parentCreateCuadro,
    onGenerateSchematic: parentGenerateSchematic,
    standalone = false
}: TechnicalFormsProps = {}) {
    const { id } = useParams();
    const [loading, setLoading] = useState(!standalone);

    // Medida y Tierra Form
    const { register: registerMtd, handleSubmit: submitMtd, reset: resetMtd } = useForm();
    const [activeTab, setActiveTab] = useState(standalone ? 'cuadros' : 'general');
    const [cuadros, setCuadros] = useState<any[]>([]);

    // Verificaciones Form
    const { register: registerVerif, handleSubmit: submitVerif, reset: resetVerif } = useForm();

    useEffect(() => {
        if (standalone && initialData) {
            loadData(initialData);
            setLoading(false);
        } else if (!standalone && id) {
            fetchTechnicalData();
        }
    }, [id, standalone, initialData]);

    const loadData = (data: any) => {
        if (data.cuadros) setCuadros(data.cuadros);
        if (data.verificaciones) resetVerif(data.verificaciones);

        const mtd = data.mtdData || {};
        // Auto-fill from Installation data if available (only for Expedientes)
        if (!standalone) {
            if (!mtd.titularNombre && data.installation?.client?.name) mtd.titularNombre = data.installation.client.name;
            if (!mtd.titularNif && data.installation?.client?.nif) mtd.titularNif = data.installation.client.nif;
            if (!mtd.direccion && data.installation?.address) mtd.direccion = data.installation.address;
            if (!mtd.potenciaPrevista && data.installation?.contractedPower) mtd.potenciaPrevista = data.installation.contractedPower;
        }

        if (!mtd.tensionNominal) mtd.tensionNominal = '230';
        if (!mtd.usoInstalacion) mtd.usoInstalacion = 'vivienda';

        resetMtd(mtd);
    };

    const fetchTechnicalData = async () => {
        try {
            const data = await apiRequest(`/expedientes/${id}`);
            loadData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const onSaveVerificaciones = async (data: any) => {
        if (parentSaveVerif) return parentSaveVerif(data);
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
        if (parentSaveMtd) {
            // For independent schematics, we might need to sync "general" fields (client, address) with the MTD data
            return parentSaveMtd(data);
        }
        try {
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
        if (parentDeleteCuadro) {
            await parentDeleteCuadro(cuadroId);
            // Parent should trigger reload or we update local state?
            // Ideally parent updates initialData, but here we might need to manually refresh or trust parent.
            // For standalone, we might simply update local state if it's not server-synced instantly?
            // Assuming server sync for consistency.
            if (!standalone) fetchTechnicalData();
            return;
        }
        try {
            await apiRequest(`/technical/cuadros/${cuadroId}`, { method: 'DELETE' });
            fetchTechnicalData();
        } catch (error) {
            alert('Error borrando cuadro');
        }
    };

    const [editingCuadro, setEditingCuadro] = useState<any>(null);

    const onSaveCuadroComponents = async (data: any) => {
        if (!editingCuadro) return;
        if (parentSaveCuadroComponents) {
            await parentSaveCuadroComponents(editingCuadro.id, data);
            setEditingCuadro(null);
            return;
        }
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

    const [isCreateCuadroOpen, setIsCreateCuadroOpen] = useState(false);
    const [newCuadroName, setNewCuadroName] = useState('');

    const handleCreateCuadroSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCuadroName) return;

        if (parentCreateCuadro) {
            await parentCreateCuadro(newCuadroName);
            setIsCreateCuadroOpen(false);
            setNewCuadroName('');
            return;
        }

        try {
            await apiRequest(`/technical/expedientes/${id}/cuadros`, {
                method: 'POST',
                body: JSON.stringify({ name: newCuadroName, description: '' })
            });
            fetchTechnicalData();
            setIsCreateCuadroOpen(false);
            setNewCuadroName('');
        } catch (e) {
            alert('Error creando cuadro');
        }
    };

    const handleGenerateSchematic = async () => {
        if (parentGenerateSchematic) {
            return parentGenerateSchematic();
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/documents/expedientes/${id}/schematic/generate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
            alert('Error al descargar esquema');
        }
    };


    if (loading) return <div className="text-slate-400">Cargando...</div>;

    const allTabs = [
        { id: 'general', name: 'General' },
        { id: 'enlace', name: 'Enlace' },
        { id: 'medida', name: 'Medida/Tierra' },
        { id: 'derivacion', name: 'Derivación' },
        { id: 'cuadros', name: 'Cuadros' },
        { id: 'verificaciones', name: 'Verific.' }
    ];

    const tabs = standalone
        ? allTabs.filter(t => ['general', 'cuadros'].includes(t.id))
        : allTabs;

    const inputClasses = "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 placeholder:text-slate-500 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:ring-1 sm:text-sm px-3 py-2.5 transition-all";
    const labelClasses = "block text-xs font-medium text-slate-400 mb-1";
    const sectionTitleClasses = "text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 mb-6 flex items-center gap-2";
    const buttonPrimary = "inline-flex justify-center rounded-lg border border-transparent bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/20 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all active:scale-[0.99]";

    return (
        <div className="bg-slate-900/30 sm:rounded-lg">
            <CuadroModal
                isOpen={!!editingCuadro}
                onClose={() => setEditingCuadro(null)}
                cuadroName={editingCuadro?.name || ''}
                initialData={editingCuadro}
                onSave={onSaveCuadroComponents}
            />

            <div className="border-b border-slate-800 mb-6 overflow-x-auto">
                <nav className="-mb-px flex space-x-6 min-w-max" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id
                                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-all rounded-t-lg`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* General Data Tab */}
            {activeTab === 'general' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div>
                        <h3 className={sectionTitleClasses}>Datos Generales</h3>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Titular</label>
                                <input {...registerMtd('titularNombre')} type="text" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>NIF / CIF</label>
                                <input {...registerMtd('titularNif')} type="text" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Representante</label>
                                <input {...registerMtd('representanteNombre')} type="text" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>DNI Representante</label>
                                <input {...registerMtd('representanteDni')} type="text" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-6">
                                <label className={labelClasses}>Dirección</label>
                                <input {...registerMtd('direccion')} type="text" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Ref. Catastral</label>
                                <input {...registerMtd('refCatastral')} type="text" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Uso</label>
                                <select {...registerMtd('usoInstalacion')} className={inputClasses}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="vivienda">Vivienda</option>
                                    <option value="local_publica_concurrencia">Local Pública Concurrencia</option>
                                    <option value="local_industrial">Industrial</option>
                                    <option value="comun_edificio">Servicios Comunes</option>
                                    <option value="garaje">Garaje</option>
                                    <option value="alumbrado_exterior">Alumbrado Exterior</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Tensión</label>
                                <select {...registerMtd('tensionNominal')} className={inputClasses}>
                                    <option value="230">230 V (Monofásico)</option>
                                    <option value="400">400 V (Trifásico)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Superficie (m²)</label>
                                <input {...registerMtd('superficie')} type="number" step="0.01" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Potencia (kW)</label>
                                <input {...registerMtd('potenciaPrevista')} type="number" step="0.01" className={inputClasses} />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={submitMtd(onSaveMtd)} className={buttonPrimary}>
                                Guardar General
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enlace Tab */}
            {activeTab === 'enlace' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div>
                        <h3 className={sectionTitleClasses}>Enlace y Acometida</h3>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Tipo Acometida</label>
                                <select {...registerMtd('acometidaTipo')} className={inputClasses}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="aerea_posada">Aérea Posada</option>
                                    <option value="aerea_tensada">Aérea Tensada</option>
                                    <option value="subterranea">Subterránea</option>
                                    <option value="areo_subterranea">Aéreo-Subterránea</option>
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Punto Conexión</label>
                                <input {...registerMtd('acometidaPuntoConexion')} type="text" className={inputClasses} />
                            </div>

                            <div className="sm:col-span-6 mt-4">
                                <h4 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-2">CGP</h4>
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Ubicación</label>
                                <input list="cgpUbicacionOptions" {...registerMtd('cgpUbicacion')} className={inputClasses} />
                                <datalist id="cgpUbicacionOptions">
                                    <option value="Fachada" />
                                    <option value="Nicho en pared" />
                                    <option value="Interior Zona Común" />
                                </datalist>
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Esquema</label>
                                <input {...registerMtd('cgpEsquema')} type="text" className={inputClasses} />
                            </div>

                            <div className="sm:col-span-6 mt-4">
                                <h4 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-2">LGA</h4>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Material</label>
                                <select {...registerMtd('lgaMaterial')} className={inputClasses}>
                                    <option value="cu">Cobre (Cu)</option>
                                    <option value="al">Aluminio (Al)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Sección (mm²)</label>
                                <input {...registerMtd('lgaSeccion')} type="number" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Aislamiento</label>
                                <select {...registerMtd('lgaAislamiento')} className={inputClasses}>
                                    <option value="450/750 V">450/750 V</option>
                                    <option value="0.6/1 kV">0.6/1 kV</option>
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Instalación</label>
                                <select {...registerMtd('lgaInstalacion')} className={inputClasses}>
                                    <option value="tubo_empotrado">Tubo empotrado</option>
                                    <option value="tubo_superficie">Tubo superficie</option>
                                    <option value="canaladura">Canaladura</option>
                                    <option value="enterrado">Enterrado</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={submitMtd(onSaveMtd)} className={buttonPrimary}>Guardar Enlace</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'derivacion' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div>
                        <h3 className={sectionTitleClasses}>Derivación Individual</h3>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 pl-1">
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Material</label>
                                <select {...registerMtd('diMaterial')} className={inputClasses}>
                                    <option value="cu">Cobre (Cu)</option>
                                    <option value="al">Aluminio (Al)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Sección (mm²)</label>
                                <input {...registerMtd('diSeccion')} type="number" className={inputClasses} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>Aislamiento</label>
                                <select {...registerMtd('diAislamiento')} className={inputClasses}>
                                    <option value="450/750 V">450/750 V</option>
                                    <option value="0.6/1 kV">0.6/1 kV</option>
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label className={labelClasses}>Instalación</label>
                                <select {...registerMtd('diInstalacion')} className={inputClasses}>
                                    <option value="tubo_empotrado">Tubo empotrado</option>
                                    <option value="tubo_superficie">Tubo superficie</option>
                                    <option value="canaladura">Canaladura</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClasses}>H.F.</label>
                                <div className="mt-2 text-slate-300 flex items-center gap-2">
                                    <input type="checkbox" {...registerMtd('diLibreHalogenos')} className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500" />
                                    <span>Libre Halógenos</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={submitMtd(onSaveMtd)} className={buttonPrimary}>Guardar Derivación</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'medida' && (
                <form onSubmit={submitMtd(onSaveMtd)} className="space-y-6">
                    <div>
                        <h3 className={sectionTitleClasses}>Medida</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClasses}>Situación</label>
                                <select {...registerMtd('medidaSituacion')} className={inputClasses}>
                                    <option value="individual_unico_usuario">Individual Único</option>
                                    <option value="concentracion_contadores">Concentración</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Ubicación</label>
                                <input type="text" {...registerMtd('medidaUbicacion')} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Sistema</label>
                                <select {...registerMtd('medidaSistema')} className={inputClasses}>
                                    <option value="directa">Directa</option>
                                    <option value="indirecta">Indirecta</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className={sectionTitleClasses}>Puesta a Tierra</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Electrodo</label>
                                <select {...registerMtd('tierraElectrodo')} className={inputClasses}>
                                    <option value="Picas">Picas</option>
                                    <option value="Placas">Placas</option>
                                    <option value="Conductor Enterrado">Cond. Enterrado</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Resistencia (Ω)</label>
                                <input type="number" step="0.01" {...registerMtd('tierraResistencia')} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Sección (mm²)</label>
                                <input type="number" step="0.1" {...registerMtd('tierraSeccion', { valueAsNumber: true })} className={inputClasses} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" className={buttonPrimary}>Guardar Medida/Tierra</button>
                    </div>
                </form>
            )}

            {activeTab === 'cuadros' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={sectionTitleClasses.replace('mb-4', 'mb-0 border-b-0')}>Cuadros Eléctricos</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsCreateCuadroOpen(true)}
                                className="text-xs sm:text-sm bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-lg transition-colors"
                            >
                                + Añadir Cuadro
                            </button>
                            <button
                                onClick={handleGenerateSchematic}
                                className="text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
                            >
                                📄 Esquema
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {cuadros.map((cuadro: any) => (
                            <div key={cuadro.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <span className="font-semibold text-slate-200 block">{cuadro.name}</span>
                                    <span className="text-xs text-slate-500 mt-1 block">
                                        {cuadro.mainBreaker ? `IGA: ${cuadro.mainBreaker.amperage}A` : 'Sin IGA'} •
                                        {cuadro.differentials ? ` ${cuadro.differentials.length} Dif.` : ' 0 Dif.'}
                                    </span>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => setEditingCuadro(cuadro)} className="flex-1 sm:flex-none text-center text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-2 rounded-lg transition-colors border border-sky-500/20">
                                        Editar
                                    </button>
                                    <button onClick={() => deleteCuadro(cuadro.id)} className="flex-1 sm:flex-none text-center text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-colors border border-red-500/20">
                                        Borrar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {isCreateCuadroOpen && (
                        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-100">Nuevo Cuadro</h3>
                                    <button onClick={() => setIsCreateCuadroOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                                </div>
                                <form onSubmit={handleCreateCuadroSubmit} className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Nombre del Cuadro</label>
                                        <input
                                            type="text"
                                            autoFocus
                                            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            placeholder="Ej: General, Planta 1..."
                                            value={newCuadroName}
                                            onChange={e => setNewCuadroName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateCuadroOpen(false)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm transition-colors shadow-lg shadow-sky-900/20"
                                        >
                                            Crear
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'verificaciones' && (
                <form onSubmit={submitVerif(onSaveVerificaciones)} className="space-y-6">
                    <h3 className={sectionTitleClasses}>Verificaciones Finales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Continuidad</label>
                            <select {...registerVerif('continuity')} className={inputClasses}>
                                <option value="CORRECTO">Correcto</option>
                                <option value="NO_CORRECTO">No Correcto</option>
                                <option value="NO_APLICA">No Aplica</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Aislamiento</label>
                            <select {...registerVerif('insulation')} className={inputClasses}>
                                <option value="CORRECTO">Correcto</option>
                                <option value="NO_CORRECTO">No Correcto</option>
                                <option value="NO_APLICA">No Aplica</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Resistencia Tierra (Ω)</label>
                            <input type="number" step="0.01" {...registerVerif('earthResistance')} className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Disparo Diferenciales</label>
                            <select {...registerVerif('differentialTrip')} className={inputClasses}>
                                <option value="CORRECTO">Correcto</option>
                                <option value="NO_CORRECTO">No Correcto</option>
                                <option value="NO_APLICA">No Aplica</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className={buttonPrimary}>Guardar Verificaciones</button>
                    </div>
                </form>
            )}
        </div>
    );
}
