import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { register, handleSubmit } = useForm();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            login(res.token, res.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Logo / título */}
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500">
                        <span className="text-xs font-semibold tracking-wide text-slate-950">
                            LV
                        </span>
                    </div>
                    <h1 className="text-lg font-semibold text-slate-50">
                        Acceso a boletines
                    </h1>
                    <p className="mt-1 text-xs text-slate-400">
                        Gestiona tus boletines, certificados y avisos desde el móvil.
                    </p>
                </div>

                {/* Card de login */}
                <div className="rounded-2xl bg-slate-900/80 p-4 shadow-lg shadow-slate-950/60 border border-slate-800">
                    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Correo profesional
                            </label>
                            <input
                                type="email"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                placeholder="taller@empresa.com"
                                {...register("email", { required: true })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                placeholder="••••••••"
                                {...register("password", { required: true })}
                            />
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs text-center">{error}</div>
                        )}

                        <div className="flex items-center justify-between text-[11px]">
                            <label className="flex items-center gap-2 text-slate-400">
                                <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0"
                                />
                                <span>Recordar en este dispositivo</span>
                            </label>
                            <button
                                type="button"
                                className="text-sky-400 hover:text-sky-300 font-medium"
                            >
                                He olvidado la contraseña
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 hover:bg-sky-400 active:bg-sky-500 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
                        >
                            {loading ? 'Cargando...' : 'Entrar'}
                        </button>
                    </form>
                </div>

                {/* Nota inferior */}
                <p className="mt-4 text-[11px] text-center text-slate-500">
                    Acceso exclusivo para instaladores autorizados de baja tensión.
                </p>
            </div>
        </div>
    );
}
