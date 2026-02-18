import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TechnicalForms from './TechnicalForms';
import { apiRequest, API_URL } from '../api';
import { ArrowLeft } from 'lucide-react';
import {
    recalcularNumeracionCircuitos,
    ajustarPolosSegunGeneral,
    generarTextoNomenclatura,
    convertFlatToTree,
    convertTreeToFlat
} from '../utils/unifilarUtils';
import { UnifilarSchematic } from '../types/unifilar';

export default function SchematicEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [esquema, setEsquema] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEsquema();
    }, [id]);

    const fetchEsquema = async () => {
        try {
            const data = await apiRequest(`/esquemas/${id}`);
            // Parse 'data' field which is a JSON string in DB
            let parsedData = {};
            try {
                parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            } catch (e) {
                console.error("Error parsing esquema data JSON", e);
            }

            // Merge top-level fields into the structure TechnicalForms expects
            const technicalData = {
                ...parsedData, // cuadros, verificaciones, mtdData (internal)
                id: data.id,
                derivacion: (parsedData as any).derivacion || {
                    tension: 230,
                    seccion: 6,
                    material: 'Cu',
                    aislamiento: 'ES07Z1-K',
                    texto_nomenclatura: '2x6 mm2 Cu ES07Z1-K AS'
                },
                installation: { // Mock installation object to populate mtd defaults if needed
                    client: { name: data.client, nif: '' },
                    address: data.address,
                    contractedPower: data.power
                },
                mtdData: {
                    ...(parsedData as any).mtdData,
                    titularNombre: data.client,
                    direccion: data.address,
                    potenciaPrevista: data.power
                }
            };

            setEsquema({ ...data, technicalData });
        } catch (error) {
            console.error(error);
            alert('Error cargando el esquema');
            navigate('/esquemas');
        } finally {
            setLoading(false);
        }
    };

    const saveEsquema = async (payload: any, successMessage?: string) => {
        try {
            // First, ensure the technicalData is properly typed and calculated
            const technicalDataToSave = { ...payload.data };

            // Apply unifilar logic: numbering and poles
            const wrappedSchematic: UnifilarSchematic = {
                id: (esquema as any).id,
                derivacion: technicalDataToSave.derivacion,
                cuadros: technicalDataToSave.cuadros
            };

            recalcularNumeracionCircuitos(wrappedSchematic);
            ajustarPolosSegunGeneral(wrappedSchematic);

            // Update the technicalDataToSave with the processed schematic data
            technicalDataToSave.derivacion = wrappedSchematic.derivacion;
            technicalDataToSave.cuadros = wrappedSchematic.cuadros;

            const finalPayload = {
                ...payload, // Keep client, address, power from original payload
                data: JSON.stringify(technicalDataToSave) // Stringify the technicalData part
            };

            const data = await apiRequest(`/esquemas/${id}`, {
                method: 'PUT',
                body: JSON.stringify(finalPayload)
            });

            // Parse 'data' field which is a JSON string in DB
            let parsedData = {};
            try {
                parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            } catch (e) {
                console.error("Error parsing response data JSON", e);
            }

            const technicalData: any = {
                ...parsedData,
                installation: {
                    client: { name: (data as any).client, nif: '' },
                    address: (data as any).address,
                    contractedPower: (data as any).power
                }
            };

            if (!technicalData.cuadros) {
                technicalData.cuadros = [];
            } else {
                // Ensure each cuadro has the new dispositivos tree structure if missing,
                // or keep it if already present. If we have legacy data (mainBreaker/differentials),
                // we should migrate it to 'dispositivos'.
                technicalData.cuadros = technicalData.cuadros.map((c: any) => {
                    if (!c.dispositivos && (c.mainBreaker || c.differentials)) {
                        return { ...c, dispositivos: convertFlatToTree(c) };
                    }
                    return { ...c, dispositivos: c.dispositivos || [] };
                });
            }

            setEsquema({ ...data, technicalData });
            if (successMessage) alert(successMessage);
        } catch (error) {
            console.error('Save failed:', error);
            alert(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    const onSaveMtd = async (mtdData: any) => {
        const payload = {
            client: mtdData.titularNombre || esquema.client,
            address: mtdData.direccion || esquema.address,
            power: mtdData.potenciaPrevista || esquema.power,
            data: {
                ...esquema.technicalData,
                mtdData
            }
        };
        await saveEsquema(payload, 'Datos generales guardados');
    };

    const onSaveVerificaciones = async (verifData: any) => {
        const payload = {
            data: {
                ...esquema.technicalData,
                verificaciones: verifData
            }
        };
        await saveEsquema(payload, 'Verificaciones guardadas');
    };

    const onCreateCuadro = async (name: string) => {
        const currentCuadros = esquema.technicalData.cuadros || [];
        const newCuadro = {
            id: crypto.randomUUID(),
            name,
            dispositivos: []
        };

        const payload = {
            data: {
                ...esquema.technicalData,
                cuadros: [...currentCuadros, newCuadro]
            }
        };
        await saveEsquema(payload);
    };

    const onDeleteCuadro = async (cuadroId: string) => {
        const currentCuadros = esquema.technicalData.cuadros || [];
        const filtered = currentCuadros.filter((c: any) => c.id !== cuadroId);

        const payload = {
            data: {
                ...esquema.technicalData,
                cuadros: filtered
            }
        };
        await saveEsquema(payload, 'Cuadro eliminado');
    };

    const onSaveCuadroComponents = async (cuadroId: string, components: any) => {
        // 'components' comes flat from CuadroModal. Convert to tree.
        const treeDispositivos = convertFlatToTree(components);

        const currentCuadros = esquema.technicalData.cuadros || [];
        const updatedCuadros = currentCuadros.map((c: any) =>
            c.id === cuadroId ? { ...c, dispositivos: treeDispositivos } : c
        );

        const payload = {
            data: {
                ...esquema.technicalData,
                cuadros: updatedCuadros
            }
        };
        await saveEsquema(payload, 'Componentes del cuadro guardados');
    };

    const onUpdateDerivacion = async (derivData: any) => {
        const nomenclature = generarTextoNomenclatura(derivData);
        const payload = {
            data: {
                ...esquema.technicalData,
                derivacion: {
                    ...derivData,
                    texto_nomenclatura: nomenclature
                }
            }
        };
        await saveEsquema(payload, 'Datos de derivación actualizados');
    };

    const onGenerateSchematic = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/esquemas/${id}/generate`, {
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
            console.error(error);
            alert('Error al descargar esquema');
        }
    };

    if (loading) return <div className="text-center py-12 text-slate-400">Cargando editor...</div>;

    return (
        <div>
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate('/esquemas')}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-100">{esquema?.name}</h1>
                    <p className="text-sm text-slate-500">{esquema?.client} - {esquema?.address}</p>
                </div>
            </div>



            <TechnicalForms
                initialData={{
                    ...esquema.technicalData,
                    cuadros: (esquema.technicalData.cuadros || []).map((c: any) => ({
                        ...c,
                        // Map tree back to flat for the UI
                        ...(c.dispositivos ? convertTreeToFlat(c.dispositivos) : {})
                    }))
                }}
                standalone
                onSaveMtd={onSaveMtd}
                onSaveVerificaciones={onSaveVerificaciones}
                onCreateCuadro={onCreateCuadro}
                onDeleteCuadro={onDeleteCuadro}
                onSaveCuadroComponents={onSaveCuadroComponents}
                onGenerateSchematic={onGenerateSchematic}
                onUpdateDerivacion={onUpdateDerivacion}
            />
        </div >
    );
}
