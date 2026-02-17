import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest, API_URL } from '../api';
import SignatureCanvas from '../components/SignatureCanvas';
import TechnicalForms from './TechnicalForms';
import { EstadoPill } from '../components/EstadoPill';

export default function ExpedienteDetail() {
    const { id } = useParams();
    const [expediente, setExpediente] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resumen');

    useEffect(() => {
        fetchExpediente();
    }, [id]);

    const fetchExpediente = async () => {
        try {
            const data = await apiRequest(`/expedientes/${id}`);
            setExpediente(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignatureSave = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('signature', blob, 'signature.png');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/documents/expedientes/${id}/signature`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            alert('Firma guardada correctamente');
            fetchExpediente();
        } catch (error) {
            console.error('Error saving signature', error);
            alert('Error al guardar la firma');
        }
    };

    const handleDniUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('dni', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/documents/expedientes/${id}/dni`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Error subiendo DNI');

            alert('DNI subido correctamente');
            fetchExpediente();
        } catch (error) {
            console.error(error);
            alert('Error al subir DNI');
        }
    };

    const generateAuthorization = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = `${API_URL}/documents/expedientes/${id}/authorization/generate`;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Error generando PDF');

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `autorizacion-${expediente.code}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (error) {
            console.error(error);
            alert('Error generando autorización');
        }
    };

    const generateMTD = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = `${API_URL}/documents/expedientes/${id}/mtd/generate`;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorText = await res.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || errorText);
                } catch (e) {
                    throw new Error(errorText || 'Error generando MTD');
                }
            }

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `mtd-${expediente.code}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (error: any) {
            console.error(error);
            alert(`Error generando MTD: ${error.message}`);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando expediente...</div>;
    if (!expediente) return <div className="p-8 text-center text-red-400">Expediente no encontrado</div>;

    const tabs = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'autorizacion', label: 'Autorización' },
        { id: 'instalacion', label: 'Instalación' },
        { id: 'documentos', label: 'Documentos' },
    ];

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-100">{expediente.code}</h2>
                            <EstadoPill estado={expediente.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                            {expediente.installation?.client?.name}
                        </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={generateMTD}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
                        >
                            <span>📄</span> MTD
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-800">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id
                                ? 'border-sky-500 text-sky-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">

                {activeTab === 'resumen' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                            <h4 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                👤 Información del Cliente
                            </h4>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                    <dt className="text-slate-500">Nombre</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.client?.name}</dd>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                    <dt className="text-slate-500">NIF/CIF</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.client?.nif}</dd>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                    <dt className="text-slate-500">Teléfono</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.client?.phone || '-'}</dd>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <dt className="text-slate-500">Email</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.client?.email || '-'}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                            <h4 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                📍 Ubicación
                            </h4>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                    <dt className="text-slate-500">Dirección</dt>
                                    <dd className="font-medium text-slate-200 text-right">{expediente.installation?.address}</dd>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                    <dt className="text-slate-500">Municipio</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.municipality}</dd>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                    <dt className="text-slate-500">C.P.</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.postalCode}</dd>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <dt className="text-slate-500">CUPS</dt>
                                    <dd className="font-medium text-slate-200">{expediente.installation?.cups || '-'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                )}

                {activeTab === 'autorizacion' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="bg-amber-900/20 border border-amber-900/30 p-4 rounded-lg">
                            <div className="flex gap-3">
                                <span className="text-amber-500">ℹ️</span>
                                <div>
                                    <h3 className="text-sm font-medium text-amber-500">Recogida de Firma</h3>
                                    <p className="mt-1 text-sm text-amber-400/80">
                                        Solicita al cliente que firme en el recuadro inferior para autorizar los trámites.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {expediente.authorization?.signaturePath ? (
                            <div className="bg-emerald-900/20 border border-emerald-900/30 p-6 rounded-xl text-center flex flex-col items-center">
                                <span className="text-4xl mb-3">✅</span>
                                <h3 className="text-lg font-medium text-emerald-400">Documento Firmado</h3>
                                <p className="text-emerald-400/70 mb-4 text-sm">La firma ha sido registrada correctamente.</p>
                                <a
                                    href={`${window.location.origin}/${expediente.authorization.signaturePath.replace(/\\/g, '/')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:text-sky-300 underline text-sm"
                                >
                                    Ver Firma Registrada
                                </a>
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                <label className="block text-sm font-medium text-slate-300 mb-3">Panel de Firma</label>
                                <div className="border-2 border-dashed border-slate-700 rounded-lg p-1 bg-slate-950">
                                    <SignatureCanvas onSave={handleSignatureSave} />
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-800 pt-6">
                            <label className="block text-sm font-medium text-slate-300 mb-3">Foto DNI (Opcional)</label>

                            {expediente.authorization?.idCardPath && (
                                <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-900/10 border border-emerald-900/20 rounded-lg">
                                    <span className="text-emerald-500">✅</span>
                                    <span className="text-sm text-emerald-400">DNI Subido</span>
                                    <a
                                        href={`${window.location.origin}/${expediente.authorization.idCardPath.replace(/\\/g, '/')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto text-xs text-sky-400 hover:text-sky-300 underline"
                                    >
                                        Ver
                                    </a>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleDniUpload}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'instalacion' && (
                    <div className="bg-slate-900/30 p-1 rounded-xl">
                        <TechnicalForms />
                    </div>
                )}

                {activeTab === 'documentos' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/40 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-slate-200">Autorización Cliente</h4>
                                <p className="text-sm text-slate-500 mt-2">Documento de autorización firmado por el cliente.</p>
                            </div>
                            <button
                                onClick={generateAuthorization}
                                className="mt-6 w-full bg-slate-800 border border-slate-700 text-slate-300 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium hover:bg-slate-700 hover:text-white transition-colors"
                            >
                                📄 Descargar PDF Autorización
                            </button>
                        </div>

                        <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/40 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-slate-200">Memoria Técnica (MTD)</h4>
                                <p className="text-sm text-slate-500 mt-2">Documento oficial generado con todos los datos técnicos.</p>
                            </div>
                            <button
                                onClick={generateMTD}
                                className="mt-6 w-full bg-sky-600 border border-transparent text-white py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium hover:bg-sky-500 transition-colors"
                            >
                                📄 Generar y Descargar MTD
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
