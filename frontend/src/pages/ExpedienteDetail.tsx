import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import SignatureCanvas from '../components/SignatureCanvas';
import TechnicalForms from './TechnicalForms';

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
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/expedientes/${id}/signature`, {
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
            fetchExpediente(); // Refresh to show "Signed" status
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
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/expedientes/${id}/dni`, {
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
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/expedientes/${id}/authorization/generate`;

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
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/expedientes/${id}/mtd/generate`;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Error generando MTD');

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `mtd-${expediente.code}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (error) {
            console.error(error);
            alert('Error generando MTD');
        }
    };



    if (loading) return <div className="p-8 text-center">Cargando expediente...</div>;
    if (!expediente) return <div className="p-8 text-center text-red-600">Expediente no encontrado</div>;

    const tabs = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'autorizacion', label: 'Autorización' },
        { id: 'instalacion', label: 'Instalación (Técnico)' },
        { id: 'documentos', label: 'Documentos' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Expediente: <span className="text-blue-600">{expediente.code}</span>
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {expediente.installation?.client?.name} - {expediente.status}
                        </p>
                    </div>
                    <div className="flex justify-end space-x-3 mb-4">
                        <button
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/expedientes/${id}/mtd/generate`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (!response.ok) {
                                        const errorText = await response.text();
                                        try {
                                            const errorJson = JSON.parse(errorText);
                                            throw new Error(errorJson.error || errorText);
                                        } catch (e) {
                                            throw new Error(errorText || 'Error generando PDF');
                                        }
                                    }
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `mtd-${expediente.code}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                } catch (error: any) {
                                    console.error(error);
                                    alert(`Error al descargar MTD: ${error.message}`);
                                }
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                            Descargar MTD (PDF)
                        </button>
                        <button
                            onClick={() => setActiveTab('mtd')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'mtd' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Datos MTD
                        </button>
                    </div>
                    <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expediente.status === 'EN_CURSO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {expediente.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
                <nav className="-mb-px flex space-x-8 px-4 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white shadow rounded-lg p-6 min-h-[400px]">

                {activeTab === 'resumen' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-gray-900 mb-3 border-b pb-2">Información del Cliente</h4>
                            <dl className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><dt>Nombre:</dt><dd className="font-medium text-gray-900">{expediente.installation?.client?.name}</dd></div>
                                <div className="flex justify-between"><dt>NIF/CIF:</dt><dd className="font-medium text-gray-900">{expediente.installation?.client?.nif}</dd></div>
                                <div className="flex justify-between"><dt>Teléfono:</dt><dd className="font-medium text-gray-900">{expediente.installation?.client?.phone || '-'}</dd></div>
                                <div className="flex justify-between"><dt>Email:</dt><dd className="font-medium text-gray-900">{expediente.installation?.client?.email || '-'}</dd></div>
                            </dl>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-3 border-b pb-2">Ubicación de la Instalación</h4>
                            <dl className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><dt>Dirección:</dt><dd className="font-medium text-gray-900">{expediente.installation?.address}</dd></div>
                                <div className="flex justify-between"><dt>Municipio:</dt><dd className="font-medium text-gray-900">{expediente.installation?.municipality}</dd></div>
                                <div className="flex justify-between"><dt>C.P.:</dt><dd className="font-medium text-gray-900">{expediente.installation?.postalCode}</dd></div>
                                <div className="flex justify-between"><dt>CUPS:</dt><dd className="font-medium text-gray-900">{expediente.installation?.cups || '-'}</dd></div>
                            </dl>
                        </div>
                    </div>
                )}

                {activeTab === 'autorizacion' && (
                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-yellow-800">Recogida de Firma</h3>
                                    <div className="mt-2 text-sm text-yellow-700">
                                        <p>Solicita al cliente que firme en el recuadro inferior para autorizar los trámites.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {expediente.authorization?.signaturePath ? (
                            <div className="border border-green-200 bg-green-50 p-6 rounded-lg text-center flex flex-col items-center">
                                <span className="text-5xl mb-4 block">✅</span>
                                <h3 className="text-lg font-medium text-green-900">Documento Firmado</h3>
                                <p className="text-green-600 mb-4">La firma ya ha sido registrada en el sistema.</p>
                                <a
                                    href={`${window.location.origin}/${expediente.authorization.signaturePath.replace(/\\/g, '/')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                    Ver Firma
                                </a>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Panel de Firma</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-1 bg-gray-50">
                                    <SignatureCanvas onSave={handleSignatureSave} />
                                </div>
                            </div>
                        )}

                        {/* Example DNI Upload - could be enhanced */}
                        {/* DNI Upload */}
                        <div className="border-t pt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto DNI (Opcional)</label>
                            {expediente.authorization?.idCardPath ? (
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="flex items-center text-green-600 bg-green-50 p-2 rounded">
                                        <span className="mr-2">✅</span> DNI Subido Exitosamente
                                    </div>
                                    <a
                                        href={`${window.location.origin}/${expediente.authorization.idCardPath.replace(/\\/g, '/')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                                    >
                                        Ver DNI
                                    </a>
                                </div>
                            ) : null}
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleDniUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Sube una foto del DNI para incluirla en la autorización.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'instalacion' && (
                    <div>
                        <div className="mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Detalles de la Instalación</h3>
                            <p className="text-sm text-gray-500">Configuración de derivaciones, cuadros eléctricos y verificaciones.</p>
                        </div>
                        <TechnicalForms />
                    </div>
                )}

                {activeTab === 'documentos' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border rounded-lg p-6 bg-gray-50 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900">Autorización Cliente</h4>
                                    <p className="text-sm text-gray-500 mt-2">Documento de autorización firmado por el cliente.</p>
                                </div>
                                <button
                                    onClick={generateAuthorization}
                                    className="mt-4 w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50"
                                >
                                    📄 Descargar PDF Autorización
                                </button>
                            </div>

                            <div className="border rounded-lg p-6 bg-gray-50 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900">Memoria Técnica de Diseño (MTD)</h4>
                                    <p className="text-sm text-gray-500 mt-2">Documento oficial MTD generado con los datos del expediente.</p>
                                </div>
                                <button
                                    onClick={generateMTD}
                                    className="mt-4 w-full bg-blue-600 border border-transparent text-white py-2 px-4 rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
                                >
                                    📄 Generar y Descargar MTD
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
