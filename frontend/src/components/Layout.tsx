import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
            <header className="border-b border-zinc-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 group-hover:bg-sky-400 transition-colors">
                                <span className="text-xs font-bold text-slate-950">LV</span>
                            </div>
                            <div>
                                <span className="block text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                                    Boletines
                                </span>
                                <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    PWA · LV
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {user?.role === 'ADMIN' && (
                            <Link
                                to="/admin/users"
                                className="text-xs font-medium text-slate-400 hover:text-sky-400 transition-colors"
                            >
                                Usuarios
                            </Link>
                        )}
                        <button
                            onClick={logout}
                            className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
                        >
                            Salir
                        </button>
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
