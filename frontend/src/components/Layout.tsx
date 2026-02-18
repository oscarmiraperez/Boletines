import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
            <header className="border-b border-zinc-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link to="/esquemas" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-emerald-500 group-hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20">
                                <span className="text-xs font-bold text-slate-950">ES</span>
                            </div>
                            <div className="hidden sm:block">
                                <span className="block text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                                    Esquemas
                                </span>

                            </div>
                        </Link>

                        <div className="h-6 w-px bg-slate-800 mx-1 sm:mx-2"></div>

                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-sky-500 group-hover:bg-sky-400 transition-colors shadow-lg shadow-sky-900/20">
                                <span className="text-xs font-bold text-slate-950">LV</span>
                            </div>
                            <div className="hidden sm:block">
                                <span className="block text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                                    Boletines
                                </span>
                                <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    PWA · LV
                                </span>
                            </div>
                        </Link>

                        <div className="h-6 w-px bg-slate-800 mx-1 sm:mx-2"></div>

                        <Link to="/mecanismos" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-amber-500 group-hover:bg-amber-400 transition-colors shadow-lg shadow-amber-900/20">
                                <span className="text-xs font-bold text-slate-950">MC</span>
                            </div>
                            <div className="hidden sm:block">
                                <span className="block text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                                    Mecanismos
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {user?.role === 'ADMIN' && (
                            <Link
                                to="/admin/users"
                                className="px-3 py-1.5 rounded-md bg-slate-800/50 text-xs font-medium text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                            >
                                <span className="hidden sm:inline">Usuarios</span>
                                <span className="sm:hidden">Usr</span>
                            </Link>
                        )}
                        <div className="flex flex-col items-end">
                            <button
                                onClick={logout}
                                className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-slate-800/50 rounded-md"
                                title="Cerrar Sesión"
                            >
                                <span className="hidden sm:inline">Salir</span>
                                <span className="sm:hidden">✕</span>
                            </button>
                            <span className="text-[10px] text-slate-600 font-mono hidden sm:inline-block pr-2">v2.10</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 py-6">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
