import React, { useState, useEffect } from 'react';
import { ArrowLeft, Box, Plus, Trash2, Home, List, ChevronRight, CheckCircle, Info, FileText, Copy } from 'lucide-react';
import {
    getMechanismProjects,
    createMechanismProject,
    deleteMechanismProject,
    getMechanismProjectDetails,
    createMechanismRoom,
    copyMechanismRoom,
    deleteMechanismRoom,
    upsertMechanismItem,
    generateMechanismProjectPDF
} from './api';

const DEFAULT_MECHANISMS = [
    "Enchufe", "Conmutador", "Cruzamiento", "Interruptor",
    "Doble interruptor", "Doble conmutador", "Mecanismo persiana",
    "Salida de cordón", "Tapa ciega", "TV", "RJ45", "Roseta de fibra",
    "Marco 1 elemento", "Marco 2 elementos", "Marco 3 elementos", "Marco 4 elementos"
];

const MechanismTool = ({ onBack }) => {
    // --- ESTADO ---
    const [view, setView] = useState('projects'); // projects, rooms, counter
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [longPressTimer, setLongPressTimer] = useState(null);

    // Modales
    const [modal, setModal] = useState({ open: false, type: '', value: '', targetId: null });

    // --- CARGA DESDE API ---
    const fetchProjects = async () => {
        try {
            const data = await getMechanismProjects();
            setProjects(data);
        } catch (error) {
            console.error("Error cargando proyectos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    // --- ACCIONES DE PROYECTOS ---
    const handleCreateProject = async () => {
        if (!modal.value.trim()) return;
        try {
            await createMechanismProject({ name: modal.value });
            await fetchProjects();
            setModal({ open: false, type: '', value: '', targetId: null });
        } catch (error) {
            alert("Error al crear proyecto: " + error.message);
        }
    };

    const handleDeleteProject = async (id) => {
        if (window.confirm("¿Eliminar este proyecto y todas sus estancias?")) {
            try {
                await deleteMechanismProject(id);
                await fetchProjects();
            } catch (error) {
                alert("Error al eliminar proyecto");
            }
        }
    };

    // --- ACCIONES DE ESTANCIAS ---
    const handleCreateRoom = async () => {
        if (!modal.value.trim()) return;
        try {
            await createMechanismRoom({ projectId: activeProjectId, name: modal.value });
            await fetchProjects();
            setModal({ open: false, type: '', value: '', targetId: null });
        } catch (error) {
            alert("Error al crear estancia");
        }
    };

    const handleCopyRoom = async (room) => {
        try {
            await copyMechanismRoom({ roomId: room.id, count: 1 });
            await fetchProjects();
        } catch (error) {
            alert("Error al copiar estancia");
        }
    };

    const handleDeleteRoom = async (id) => {
        if (window.confirm("¿Eliminar esta estancia?")) {
            try {
                await deleteMechanismRoom(id);
                await fetchProjects();
            } catch (error) {
                alert("Error al eliminar estancia");
            }
        }
    };

    // --- ACCIONES DE CONTEO ---
    const updateQuantity = async (itemName, increment) => {
        const item = activeRoom?.items.find(i => i.name === itemName);
        const currentQty = item ? item.quantity : 0;
        const newQty = Math.max(0, currentQty + increment);

        // Optimistic update
        setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
                return {
                    ...p,
                    rooms: p.rooms.map(r => {
                        if (r.id === activeRoomId) {
                            const exists = r.items.find(i => i.name === itemName);
                            return {
                                ...r,
                                items: exists
                                    ? r.items.map(i => i.name === itemName ? { ...i, quantity: newQty } : i)
                                    : [...r.items, { name: itemName, quantity: newQty }]
                            };
                        }
                        return r;
                    })
                };
            }
            return p;
        }));

        try {
            await upsertMechanismItem({ roomId: activeRoomId, name: itemName, quantity: newQty });
        } catch (error) {
            console.error("Error sincronizando cantidad:", error);
            fetchProjects(); // Revert on error
        }
    };

    const createCustomItem = () => {
        if (!modal.value.trim()) return;
        updateQuantity(modal.value, 0);
        setModal({ open: false, type: '', value: '', targetId: null });
    };

    // --- HELPERS ---
    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeRoom = activeProject?.rooms.find(r => r.id === activeRoomId);

    const exportToPDF = async (projectToExport = null) => {
        const target = projectToExport || activeProject;
        if (!target) return;
        try {
            const blob = await generateMechanismProjectPDF(target.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mecanismos_${target.name.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert("Error al generar PDF: " + error.message);
        }
    };

    const getItemsForRoom = () => {
        if (!activeRoom) return [];
        const merged = [...activeRoom.items];
        DEFAULT_MECHANISMS.forEach(name => {
            if (!merged.find(i => i.name === name)) {
                merged.push({ name, quantity: 0 });
            }
        });
        return merged.sort((a, b) => {
            const idxA = DEFAULT_MECHANISMS.indexOf(a.name);
            const idxB = DEFAULT_MECHANISMS.indexOf(b.name);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
    };

    const styles = {
        card: {
            background: 'rgba(15, 32, 54, 0.7)',
            backdropFilter: 'blur(16px)',
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            color: 'white',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 210, 255, 0.1)'
        },
        titleBar: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' },
        grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '15px' },
        toolCard: {
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '18px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        },
        counterBtn: {
            height: '110px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '2px solid transparent',
            userSelect: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            position: 'relative',
            overflow: 'hidden'
        },
        activeCounter: {
            background: 'linear-gradient(145deg, rgba(0, 210, 255, 0.2), rgba(0, 51, 102, 0.6))',
            borderColor: '#00d2ff',
            color: '#00d2ff',
            boxShadow: '0 0 20px rgba(0, 210, 255, 0.3), inset 0 0 10px rgba(0, 210, 255, 0.2)'
        },
        inactiveCounter: {
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.4)',
            borderColor: 'rgba(255,255,255,0.05)'
        },
        input: {
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #00d2ff',
            background: 'rgba(0, 20, 40, 0.8)',
            color: 'white',
            marginTop: '12px',
            fontSize: '15px',
            boxSizing: 'border-box',
            boxShadow: '0 0 15px rgba(0, 210, 255, 0.1)',
            outline: 'none'
        },
        btnPrimary: {
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)',
            color: '#0a192f',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '900',
            marginTop: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 210, 255, 0.4)',
            transition: 'transform 0.2s, boxShadow 0.2s',
            letterSpacing: '0.5px'
        },
        btnSecondary: {
            width: '100%',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontWeight: 'bold',
            marginTop: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, rgba(0, 20, 40, 0.85), rgba(0, 0, 0, 0.95))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
            backdropFilter: 'blur(8px)'
        }
    };

    // --- VISTAS ---

    const renderProjects = () => (
        <div style={{ width: '100%', maxWidth: '500px' }}>
            <div style={styles.titleBar}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%' }}><ArrowLeft size={20} /></button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '0.5px' }}>MIS PROYECTOS</h2>
                    <span style={{ fontSize: '12px', opacity: 0.8, letterSpacing: '2px', fontWeight: 'bold', color: '#00d2ff' }}>LOGÍSTICA DE MECANISMOS (ONLINE)</span>
                </div>
            </div>

            <div style={styles.card}>
                <button
                    style={styles.btnPrimary}
                    onClick={() => setModal({ open: true, type: 'new_project', value: '', targetId: null })}
                >
                    <Plus size={20} style={{ marginRight: '8px' }} /> NUEVO PROYECTO
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '25px' }}>
                    {projects.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Box size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                            <p style={{ margin: 0, opacity: 0.5, fontSize: '14px' }}>No hay proyectos guardados en la nube.</p>
                        </div>
                    ) : (
                        projects.map(project => (
                            <div
                                key={project.id}
                                style={{ ...styles.toolCard, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.4)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = styles.toolCard.border; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div onClick={() => { setActiveProjectId(project.id); setView('rooms'); }} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                            <Box size={24} color="#00d2ff" />
                                        </div>
                                        <span style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.5px' }}>{project.name?.toUpperCase()}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); exportToPDF(project); }}
                                            style={{ background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.3)', color: '#00d2ff', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Generar PDF"
                                        >
                                            <FileText size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} style={{ background: 'none', border: 'none', color: 'rgba(255,0,0,0.5)', cursor: 'pointer', padding: '5px' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div onClick={() => { setActiveProjectId(project.id); setView('rooms'); }} style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px', marginLeft: '50px', cursor: 'pointer' }}>
                                    {project.rooms?.length || 0} ESTANCIAS
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderRooms = () => (
        <div style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ ...styles.titleBar, display: 'grid', gridTemplateColumns: '50px 1fr 50px', alignItems: 'center', marginBottom: '30px' }}>
                <button
                    onClick={() => setView('projects')}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(0,210,255,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <ArrowLeft size={24} />
                </button>

                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5, letterSpacing: '4px', color: '#00d2ff', textTransform: 'uppercase', marginBottom: '2px' }}>Proyecto</span>
                    <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: '#ffffff', textShadow: '0 4px 10px rgba(0,0,0,0.3)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject?.name?.toUpperCase()}</h2>
                    <div style={{ width: '40px', height: '2px', background: 'linear-gradient(90deg, transparent, #00d2ff, transparent)', marginTop: '8px', opacity: 0.6 }}></div>
                </div>

                <button
                    onClick={() => exportToPDF()}
                    style={{ background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.2)', color: '#00d2ff', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 210, 255, 0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    title="Exportar PDF Total"
                >
                    <FileText size={20} />
                </button>
            </div>

            <div style={styles.card}>
                <button
                    style={styles.btnPrimary}
                    onClick={() => setModal({ open: true, type: 'new_room', value: '', targetId: null })}
                >
                    <Plus size={20} style={{ marginRight: '8px' }} /> AÑADIR ESTANCIA
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '25px' }}>
                    {!activeProject?.rooms || activeProject.rooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Home size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                            <p style={{ margin: 0, opacity: 0.5, fontSize: '14px' }}>Añade tu primera habitación.</p>
                        </div>
                    ) : (
                        activeProject.rooms.map(r => (
                            <div
                                key={r.id}
                                style={{ ...styles.toolCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                onClick={() => { setActiveRoomId(r.id); setView('counter'); }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.4)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = styles.toolCard.border; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '12px' }}>
                                        <Home size={24} color="#00d2ff" />
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{r.name?.toUpperCase()}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Copy size={18} color="#00d2ff" style={{ opacity: 0.6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleCopyRoom(r); }} />
                                    <Trash2 size={18} color="#ff4444" style={{ opacity: 0.6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleDeleteRoom(r.id); }} />
                                    <ChevronRight size={20} color="#00d2ff" opacity={0.5} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderCounter = () => (
        <div style={{ width: '100%', maxWidth: '500px', paddingBottom: '40px' }}>
            <div style={{ ...styles.titleBar, display: 'grid', gridTemplateColumns: '50px 1fr 50px', alignItems: 'center', marginBottom: '30px' }}>
                <button
                    onClick={() => setView('rooms')}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(0,210,255,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <ArrowLeft size={24} />
                </button>

                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: '900', opacity: 0.5, letterSpacing: '3px', color: '#00d2ff', textTransform: 'uppercase', marginBottom: '2px' }}>{activeProject?.name}</span>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#ffffff', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>{activeRoom?.name?.toUpperCase()}</h2>
                    <div style={{ width: '30px', height: '2px', background: '#00d2ff', marginTop: '6px', opacity: 0.4, borderRadius: '2px' }}></div>
                </div>

                <button
                    onClick={() => exportToPDF()}
                    style={{ background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.2)', color: '#00d2ff', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 210, 255, 0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    title="Exportar PDF Proyecto"
                >
                    <FileText size={20} />
                </button>
            </div>

            <div style={{ ...styles.card, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', padding: '10px', background: 'rgba(0,210,255,0.05)', borderRadius: '10px', fontSize: '10px', color: '#00d2ff', fontWeight: 'bold' }}>
                    <Info size={14} /> CLIC: SUMAR • MANTÉN: EDITAR CANTIDAD
                </div>

                <div style={{ ...styles.grid, gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {getItemsForRoom().map(item => (
                        <div
                            key={item.name}
                            style={{
                                ...styles.counterBtn,
                                ...(item.quantity > 0 ? styles.activeCounter : styles.inactiveCounter),
                                position: 'relative'
                            }}
                            onPointerDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.95)';
                                const timer = setTimeout(() => {
                                    setModal({ open: true, type: 'edit_qty', value: item.quantity.toString(), targetId: item.name });
                                    setLongPressTimer(null);
                                }, 500);
                                setLongPressTimer({ timer, start: Date.now() });
                            }}
                            onPointerUp={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                setTimeout(() => { if (e.currentTarget) e.currentTarget.style.transform = 'translateY(0)'; }, 100);

                                if (longPressTimer) {
                                    clearTimeout(longPressTimer.timer);
                                    if (Date.now() - longPressTimer.start < 500) {
                                        updateQuantity(item.name, 1);
                                    }
                                    setLongPressTimer(null);
                                }
                            }}
                            onPointerLeave={() => {
                                if (longPressTimer) {
                                    clearTimeout(longPressTimer.timer);
                                    setLongPressTimer(null);
                                }
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <span style={{
                                fontSize: '12px',
                                fontWeight: '900',
                                textAlign: 'center',
                                height: '3em',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 5px',
                                opacity: item.quantity > 0 ? 1 : 0.7,
                                lineHeight: '1.2'
                            }}>
                                {item.name.toUpperCase()}
                            </span>
                            <span style={{
                                fontSize: '28px',
                                fontWeight: '900',
                                textShadow: item.quantity > 0 ? '0 0 15px rgba(0,210,255,0.5)' : 'none',
                                marginTop: '-5px'
                            }}>
                                {item.quantity}
                            </span>

                            {item.quantity > 0 && (
                                <div style={{ position: 'absolute', top: '5px', right: '5px' }}>
                                    <CheckCircle size={10} color="#00d2ff" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    style={{ ...styles.btnSecondary, marginTop: '25px', border: '1px dashed rgba(0, 210, 255, 0.3)', background: 'rgba(0, 210, 255, 0.02)', color: '#00d2ff' }}
                    onClick={() => setModal({ open: true, type: 'new_item', value: '', targetId: null })}
                >
                    <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> AÑADIR OTRO MECANISMO
                </button>
            </div>
        </div>
    );

    // --- MODAL RENDER ---
    const renderModal = () => {
        if (!modal.open) return null;

        const titles = {
            new_project: 'NUEVO PROYECTO',
            new_room: 'NUEVA ESTANCIA',
            new_item: 'OTRO MECANISMO',
            edit_qty: `EDITAR: ${modal.targetId}`
        };

        return (
            <div style={styles.modal}>
                <div style={{ ...styles.card, width: '100%', maxWidth: '350px' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#00d2ff', fontSize: '16px' }}>{titles[modal.type]}</h3>

                    {modal.type === 'edit_qty' ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
                                <button
                                    onClick={() => setModal({ ...modal, value: (Math.max(0, (parseInt(modal.value) || 0) - 1)).toString() })}
                                    style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '30px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    -
                                </button>
                                <span style={{ fontSize: '48px', fontWeight: '900', color: '#00d2ff', minWidth: '80px', textAlign: 'center' }}>
                                    {modal.value}
                                </span>
                                <button
                                    onClick={() => setModal({ ...modal, value: ((parseInt(modal.value) || 0) + 1).toString() })}
                                    style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '30px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    +
                                </button>
                            </div>

                            <button
                                style={{ ...styles.btnSecondary, color: '#ff4b4b', borderColor: 'rgba(255, 75, 75, 0.2)', marginBottom: '10px' }}
                                onClick={() => setModal({ ...modal, value: '0' })}
                            >
                                PONER A 0
                            </button>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setModal({ open: false, type: '', value: '', targetId: null })}>CANCELAR</button>
                                <button
                                    style={{ ...styles.btnPrimary, flex: 1 }}
                                    onClick={() => {
                                        const q = parseInt(modal.value) || 0;
                                        const current = activeRoom.items.find(i => i.name === modal.targetId)?.quantity || 0;
                                        updateQuantity(modal.targetId, q - current);
                                        setModal({ open: false, type: '', value: '', targetId: null });
                                    }}
                                >
                                    GUARDAR
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <input
                                style={styles.input}
                                type="text"
                                autoFocus
                                value={modal.value}
                                onChange={(e) => setModal({ ...modal, value: e.target.value })}
                                placeholder="Escribe aquí..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (modal.type === 'new_project') handleCreateProject();
                                        if (modal.type === 'new_room') handleCreateRoom();
                                        if (modal.type === 'new_item') createCustomItem();
                                    }
                                }}
                            />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button style={styles.btnSecondary} onClick={() => setModal({ open: false, type: '', value: '', targetId: null })}>CANCELAR</button>
                                <button
                                    style={styles.btnPrimary}
                                    onClick={() => {
                                        if (modal.type === 'new_project') handleCreateProject();
                                        if (modal.type === 'new_room') handleCreateRoom();
                                        if (modal.type === 'new_item') createCustomItem();
                                    }}
                                >
                                    CREAR
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div style={{ color: 'white', opacity: 0.5, textAlign: 'center', padding: '50px' }}>Conectando con la nube...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {view === 'projects' && renderProjects()}
            {view === 'rooms' && renderRooms()}
            {view === 'counter' && renderCounter()}
            {renderModal()}
        </div>
    );
};

export default MechanismTool;
