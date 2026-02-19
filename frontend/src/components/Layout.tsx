import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Users, LogOut, Shield } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[#0a192f] text-slate-50 font-sans selection:bg-sky-500/30">
            {/* Fondo Dinámico Portado */}
            <div className="wave-container">
                <div className="wave"></div>
            </div>

            <header className="border-b border-white/5 bg-slate-950/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                                <Shield size={20} className="text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <span className="block text-lg font-black tracking-tighter text-white">
                                    GRAVITY
                                </span>
                                <span className="block text-[8px] uppercase tracking-[0.3em] text-sky-400 font-bold">
                                    Engineering Cloud
                                </span>
                            </div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            <Link
                                to="/"
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === '/' ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Home size={16} />
                                    <span>Dashboard</span>
                                </div>
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {user?.role === 'ADMIN' && (
                            <Link
                                to="/admin/users"
                                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/40 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-white/5"
                            >
                                <Users size={14} />
                                <span>Operarios</span>
                            </Link>
                        )}

                        <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs font-bold text-white truncate max-w-[120px]">{user?.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{user?.role}</div>
                            </div>

                            <button
                                onClick={logout}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                title="Cerrar Sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 relative">
                <Outlet />
            </main>

            <footer className="py-12 text-center">
                <div className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.5em]">
                    GRAVITY CLOUD v3.0 • Premium Engineering Suite
                </div>
            </footer>
        </div>
    );
}
