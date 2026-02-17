import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TechnicalForms from './TechnicalForms';
import { apiRequest, API_URL } from '../api';
import { ArrowLeft } from 'lucide-react';

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

    // @ts-ignore
    const saveEsquema = async (updates: any) => {
        // updates might be partial. We need to reconstruct the full payload for the backend.
        // The backend expects: name, client, address, power, data (stringified)

        // We need to keep the current state of "data" (cuadros, etc) and merge updates
        const currentInternalData = esquema.technicalData; // This has { cuadros, verificaciones, mtdData }

        // If we are saving MTD, we update client/address/power top-level too
        // let topLevelUpdates = {};
        let newInternalData = { ...currentInternalData };

        if (updates.type === 'MTD') {
            const mtd = updates.data;
            // topLevelUpdates = {
            //     client: mtd.titularNombre,
            //     address: mtd.direccion,
            //     power: mtd.potenciaPrevista
            // };
            newInternalData.mtdData = mtd;
        } else if (updates.type === 'VERIFICACIONES') {
            newInternalData.verificaciones = updates.data;
        } else if (updates.type === 'CUADROS_UPDATE') {
            // updates.data is the full array of cuadros or a specific update?
            // TechnicalForms usually sends specific updates.
            // But here we might just save everything to be safe or handle specific actions.
            // Let's implement specific handlers below and call a generic save
        }

        // Generic save function logic
    };

    // Specific Handlers for TechnicalForms

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

        await apiRequest(`/esquemas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        fetchEsquema(); // Reload to sync
        alert('Datos generales guardados');
    };

    const onSaveVerificaciones = async (verifData: any) => {
        const payload = {
            data: {
                ...esquema.technicalData,
                verificaciones: verifData
            }
        };
        await apiRequest(`/esquemas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        alert('Verificaciones guardadas');
    };

    const onCreateCuadro = async (name: string) => {
        const currentCuadros = esquema.technicalData.cuadros || [];
        const newCuadro = { id: crypto.randomUUID(), name, differentials: [] }; // Generate ID frontend-side or let backend handle? 
        // Backend independent esquema doesn't have a sub-table for cuadros, it's all JSON.
        // So we generate ID here.

        const payload = {
            data: {
                ...esquema.technicalData,
                cuadros: [...currentCuadros, newCuadro]
            }
        };

        await apiRequest(`/esquemas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        fetchEsquema();
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
        await apiRequest(`/esquemas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        fetchEsquema();
    };

    const onSaveCuadroComponents = async (cuadroId: string, components: any) => {
        const currentCuadros = esquema.technicalData.cuadros || [];
        const updatedCuadros = currentCuadros.map((c: any) =>
            c.id === cuadroId ? { ...c, ...components } : c
        );

        const payload = {
            data: {
                ...esquema.technicalData,
                cuadros: updatedCuadros
            }
        };
        await apiRequest(`/esquemas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        fetchEsquema();
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
            <button
                onClick={onGenerateSchematic}
                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-sky-900/20 flex items-center gap-2 font-medium transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Generar PDF
            </button>


            <TechnicalForms
                standalone={true}
                initialData={esquema?.technicalData}
                onSaveMtd={onSaveMtd}
                onSaveVerificaciones={onSaveVerificaciones}
                onCreateCuadro={onCreateCuadro}
                onDeleteCuadro={onDeleteCuadro}
                onSaveCuadroComponents={onSaveCuadroComponents}
                onGenerateSchematic={onGenerateSchematic}
            />
        </div >
    );
}
