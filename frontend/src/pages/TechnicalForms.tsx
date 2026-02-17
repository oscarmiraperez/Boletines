import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { apiRequest, API_URL } from '../api';
import CuadroModal from '../components/CuadroModal';

export default function TechnicalForms() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);

    // Medida y Tierra Form
    const { register: registerMtd, handleSubmit: submitMtd, reset: resetMtd } = useForm();
    const [activeTab, setActiveTab] = useState('general');
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

            const mtd = data.mtdData || {};

            if (!mtd.titularNombre && data.installation?.client?.name) mtd.titularNombre = data.installation.client.name;
            if (!mtd.titularNif && data.installation?.client?.nif) mtd.titularNif = data.installation.client.nif;
            if (!mtd.direccion && data.installation?.address) mtd.direccion = data.installation.address;
            if (!mtd.potenciaPrevista && data.installation?.contractedPower) mtd.potenciaPrevista = data.installation.contractedPower;
            if (!mtd.tensionNominal) mtd.tensionNominal = '230';
            if (!mtd.usoInstalacion) mtd.usoInstalacion = 'vivienda';

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

    if (loading) return <div className="text-slate-400">Cargando...</div>;

    const tabs = [
        { id: 'general', name: 'General' },
        { id: 'enlace', name: 'Enlace' },
        { id: 'medida', name: 'Medida/Tierra' },
        { id: 'derivacion', name: 'Derivación' },
        { id: 'cuadros', name: 'Cuadros' },
        { id: 'verificaciones', name: 'Verific.' }
    ];

    const inputClasses = "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm px-3 py-2";
    const labelClasses = "block text-sm font-medium text-slate-400";
    const sectionTitleClasses = "text-lg font-medium leading-6 text-slate-200 border-b border-slate-700 pb-2 mb-4";
    const buttonPrimary = "inline-flex justify-center rounded-lg border border-transparent bg-sky-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900";

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
                                ? 'border-sky-500 text-sky-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
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
                                    <option value="230">230 V (Monofásica)</option>
                                    <option value="400">400 V (Trifásica)</option>
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
                                onClick={async () => {
                                    const name = prompt('Nombre del cuadro (Ej: General)');
                                    if (name) {
                                        await apiRequest(`/technical/expedientes/${id}/cuadros`, {
                                            method: 'POST',
                                            body: JSON.stringify({ name, description: '' })
                                        });
                                        fetchTechnicalData();
                                    }
                                }}
                                className="text-xs sm:text-sm bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-lg transition-colors"
                            >
                                + Añadir Cuadro
                            </button>
                            <button
                                onClick={async () => {
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
                                }}
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
