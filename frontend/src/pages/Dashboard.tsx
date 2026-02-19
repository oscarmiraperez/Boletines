import React, { useState } from 'react';
import {
    Zap,
    Wind,
    Radio,
    Settings,
    ChevronRight,
    TrendingUp,
    Users,
    Box
} from 'lucide-react';
import ElectricityMenu from '../ElectricityMenu';
import ClimaMenu from '../ClimaMenu';
import TelecomMenu from '../TelecomMenu';

export default function Dashboard() {
    const [view, setView] = useState('home');

    const menuItems = [
        {
            id: 'electricity',
            title: 'ELECTRICIDAD',
            subtitle: 'Cálculos REBT, esquemas y mecanismos',
            icon: <Zap size={32} color="#00d2ff" />,
            color: '#00d2ff',
            gradient: 'linear-gradient(135deg, rgba(0, 210, 255, 0.2), rgba(0, 51, 102, 0.4))'
        },
        {
            id: 'clima',
            title: 'CLIMATIZACIÓN',
            subtitle: 'Carga térmica y conductos',
            icon: <Wind size={32} color="#00ff88" />,
            color: '#00ff88',
            gradient: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 51, 102, 0.4))'
        },
        {
            id: 'telecom',
            title: 'TELECOM',
            subtitle: 'ICT-2 y redes de datos',
            icon: <Radio size={32} color="#ff00ff" />,
            color: '#ff00ff',
            gradient: 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(0, 51, 102, 0.4))'
        }
    ];

    const stats = [
        { label: 'Proyectos', value: '12', icon: <Box size={16} /> },
        { label: 'Operarios', value: '4', icon: <Users size={16} /> },
        { label: 'Actividad', value: '+24%', icon: <TrendingUp size={16} /> }
    ];

    if (view === 'electricity') return <ElectricityMenu onBack={() => setView('home')} />;
    if (view === 'clima') return <ClimaMenu onBack={() => setView('home')} />;
    if (view === 'telecom') return <TelecomMenu onBack={() => setView('home')} />;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header de Bienvenida */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
                        GRAVITY <span className="text-sky-400">CLOUD</span>
                    </h1>
                    <p className="text-slate-400 font-medium">Panel de Gestión Técnica e Ingeniería</p>
                </div>

                <div className="flex gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
                            <div className="text-sky-500">{stat.icon}</div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider line-clamp-1">{stat.label}</div>
                                <div className="text-sm font-bold text-white leading-none whitespace-nowrap">{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid de Herramientas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className="group relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/40 p-1 text-left transition-all hover:scale-[1.02] hover:border-slate-700 active:scale-[0.98]"
                        style={{ boxShadow: `0 0 40px -10px ${item.color}15` }}
                    >
                        <div className="relative z-10 p-6">
                            <div
                                className="mb-6 inline-flex rounded-2xl p-4 transition-transform group-hover:scale-110 group-hover:rotate-3"
                                style={{ background: item.gradient }}
                            >
                                {item.icon}
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white tracking-tight">{item.title}</h3>
                                <p className="text-sm text-slate-500 font-medium leading-tight">{item.subtitle}</p>
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Acceder</span>
                                <div
                                    className="rounded-full p-2 transition-transform group-hover:translate-x-1"
                                    style={{ background: `${item.color}20`, color: item.color }}
                                >
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Efecto de Luces de Fondo */}
                        <div
                            className="absolute -right-20 -top-20 h-40 w-40 rounded-full blur-[80px] opacity-0 transition-opacity group-hover:opacity-20"
                            style={{ background: item.color }}
                        />
                    </button>
                ))}
            </div>

            {/* Sección de Gestión */}
            <div className="rounded-3xl border border-slate-800/40 bg-slate-900/20 p-8 backdrop-blur-md">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Configuración del Sistema</h2>
                        <p className="text-sm text-slate-500">Gestión de usuarios, backups y reportes globales</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/50 hover:bg-slate-900 transition-colors text-left group">
                        <div className="flex items-center gap-3">
                            <Users size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                            <span className="text-sm font-semibold text-slate-300">Gestor de Operarios</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-700" />
                    </button>
                    {/* Más accesos rápidos según se necesiten */}
                </div>
            </div>
        </div>
    );
}
