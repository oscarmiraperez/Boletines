import React, { useState, useEffect } from 'react';
import { Settings, Zap, Thermometer, Radio, Cloud, Users, Trash2, Edit2, X, Save, Phone, Mail, Lock, ShieldCheck } from 'lucide-react';
import ElectricityMenu from './ElectricityMenu';
import ClimaMenu from './ClimaMenu';
import TelecomMenu from './TelecomMenu';

const App = () => {
    // --- ESTADOS ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    const [currentView, setCurrentView] = useState('home');
    const [tecnicos, setTecnicos] = useState([
        {
            id: 1,
            nombre: "Admin Principal",
            movil: "600000000",
            email: "admin@sanvicente.es",
            password: "admin",
            accesos: { electricidad: true, clima: true, telecom: true },
            estado: "Activo"
        }
    ]);

    // Estado para el formulario (Alta/Edición)
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState({
        nombre: '',
        movil: '',
        email: '',
        password: '',
        accesos: { electricidad: false, clima: false, telecom: false }
    });

    // --- LÓGICA DE GESTIÓN (CRUD) ---
    const guardarUsuario = () => {
        if (!form.nombre.trim()) return;

        if (editandoId) {
            setTecnicos(tecnicos.map(t => t.id === editandoId ? { ...form, id: t.id, estado: t.estado } : t));
            setEditandoId(null);
        } else {
            const nuevo = { ...form, id: Date.now(), estado: "Activo" };
            setTecnicos([...tecnicos, nuevo]);
        }
        resetForm();
    };

    const resetForm = () => {
        setForm({
            nombre: '',
            movil: '',
            email: '',
            password: '',
            accesos: { electricidad: false, clima: false, telecom: false }
        });
        setEditandoId(null);
    };

    const iniciarEdicion = (tecnico) => {
        setEditandoId(tecnico.id);
        setForm({ ...tecnico });
    };

    const eliminarTecnico = (id) => {
        if (window.confirm("¿Dar de baja a este operario?")) {
            setTecnicos(tecnicos.filter(t => t.id !== id));
        }
    };

    const toggleAcceso = (menu) => {
        setForm({
            ...form,
            accesos: { ...form.accesos, [menu]: !form.accesos[menu] }
        });
    };

    const styles = {
        container: {
            minHeight: '100vh',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            color: 'white',
            fontFamily: 'sans-serif',
            boxSizing: 'border-box'
        },
        headerWrapper: {
            width: '100%',
            maxWidth: '350px',
            background: 'rgba(26, 60, 90, 0.95)',
            borderRadius: '25px',
            padding: '30px 20px',
            marginTop: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)'
        },
        logoBox: {
            border: '2px solid white',
            padding: '10px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
        },
        logoTextContainer: { display: 'flex', flexDirection: 'column' },
        logoTitle: { fontSize: '10px', fontWeight: '600', letterSpacing: '2px', margin: 0, opacity: 0.9 },
        companyName: { fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px', margin: 0, textTransform: 'uppercase' },
        offlineStatus: { alignSelf: 'flex-end', marginRight: '10px', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500', background: 'rgba(0,0,0,0.2)', padding: '6px 15px', borderRadius: '20px' },
        actionGrid: { width: '100%', maxWidth: '350px', marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
        mainCard: { gridColumn: 'span 2', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px', cursor: 'pointer' },
        secondaryCard: { height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px', cursor: 'pointer' },
        cardLabel: { fontSize: '14px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' },
        adminBtn: { position: 'fixed', bottom: '30px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '15px', color: 'white', cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(5px)' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modalContent: { background: '#002244', width: '95%', maxWidth: '600px', padding: '20px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(0,210,255,0.3)', position: 'relative', boxSizing: 'border-box' },
        formBox: { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' },
        inputGroup: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,51,102,0.5)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(0,210,255,0.2)', width: '100%', boxSizing: 'border-box' },
        input: { flex: 1, background: 'none', border: 'none', color: 'white', padding: '8px 0', fontSize: '14px', outline: 'none', width: '100%', minWidth: '0' },
        permisosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', marginTop: '10px' },
        permisoBtn: { padding: '10px 5px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(0,210,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.2s', textAlign: 'center' },
        saveBtn: { width: '100%', padding: '15px', background: '#00d2ff', border: 'none', borderRadius: '8px', color: '#1a3c5a', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
        userRow: { borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '15px 0', overflow: 'hidden' },
        userHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' },
        userDetails: { display: 'flex', flexWrap: 'wrap', gap: '10px 15px', marginTop: '8px', fontSize: '12px', opacity: 0.7, wordBreak: 'break-all' }
    };

    const renderDashboard = () => (
        <>
            <div className="wave-container">
                <svg viewBox="0 0 1440 320" style={{ position: 'absolute', bottom: 0, opacity: 0.5 }}>
                    <path fill="#00d2ff" fillOpacity="1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>

            <div style={styles.headerWrapper}>
                <div style={styles.logoBox}>
                    <div style={{ fontSize: '40px' }}>⚡</div>
                    <div style={styles.logoTextContainer}>
                        <p style={styles.logoTitle}>INSTALACIONES Y SUMINISTROS</p>
                        <p style={styles.companyName}>ELÉCTRICOS SAN VICENTE</p>
                    </div>
                </div>
            </div>

            <div style={styles.offlineStatus}>
                <Cloud size={16} color={isOnline ? "#00ff00" : "#ff4444"} />
                {isOnline ? "Modo Online: Activo" : "Modo Offline: Activo"}
            </div>

            <div style={styles.actionGrid}>
                <div className="glass-card" style={styles.mainCard} onClick={() => setCurrentView('electricity')}>
                    <Zap size={60} color="#00d2ff" />
                    <span style={styles.cardLabel}>ELECTRICIDAD</span>
                </div>
                <div className="glass-card" style={styles.secondaryCard} onClick={() => setCurrentView('clima')}>
                    <Thermometer size={50} color="#00d2ff" />
                    <span style={styles.cardLabel}>CLIMATIZACIÓN</span>
                </div>
                <div className="glass-card" style={styles.secondaryCard} onClick={() => setCurrentView('telecom')}>
                    <Radio size={50} color="#00d2ff" />
                    <span style={styles.cardLabel}>TELECOM</span>
                </div>
            </div>
        </>
    );

    return (
        <div style={styles.container}>
            {currentView === 'home' ? renderDashboard() : (
                currentView === 'electricity' ? <ElectricityMenu onBack={() => setCurrentView('home')} /> :
                    currentView === 'clima' ? <ClimaMenu onBack={() => setCurrentView('home')} /> :
                        <TelecomMenu onBack={() => setCurrentView('home')} />
            )}

            <button style={styles.adminBtn} onClick={() => setIsAdminOpen(!isAdminOpen)}>
                <Settings size={30} />
            </button>

            {isAdminOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><Users /> Gestor de Operarios Avanzado</h3>
                            <X onClick={() => setIsAdminOpen(false)} style={{ cursor: 'pointer' }} />
                        </div>

                        <div style={styles.formBox}>
                            <div style={styles.inputGroup}>
                                <Users size={18} color="#00d2ff" />
                                <input style={styles.input} placeholder="Nombre completo" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={styles.inputGroup}>
                                    <Phone size={18} color="#00d2ff" />
                                    <input style={styles.input} placeholder="Móvil" value={form.movil} onChange={(e) => setForm({ ...form, movil: e.target.value })} />
                                </div>
                                <div style={styles.inputGroup}>
                                    <Mail size={18} color="#00d2ff" />
                                    <input style={styles.input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <Lock size={18} color="#00d2ff" />
                                <input style={styles.input} type="password" placeholder="Contraseña de acceso" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', margin: '0 0 10px 0' }}>
                                    <ShieldCheck size={16} color="#00d2ff" /> PLANTILLA DE ACCESOS (PERMISOS)
                                </p>
                                <div style={styles.permisosGrid}>
                                    <div
                                        onClick={() => toggleAcceso('electricidad')}
                                        style={{ ...styles.permisoBtn, background: form.accesos.electricidad ? 'rgba(0,210,255,0.2)' : 'none', color: form.accesos.electricidad ? '#00d2ff' : 'white' }}
                                    >
                                        <Zap size={20} /> ELECTRICIDAD
                                    </div>
                                    <div
                                        onClick={() => toggleAcceso('clima')}
                                        style={{ ...styles.permisoBtn, background: form.accesos.clima ? 'rgba(0,210,255,0.2)' : 'none', color: form.accesos.clima ? '#00d2ff' : 'white' }}
                                    >
                                        <Thermometer size={20} /> CLIMA
                                    </div>
                                    <div
                                        onClick={() => toggleAcceso('telecom')}
                                        style={{ ...styles.permisoBtn, background: form.accesos.telecom ? 'rgba(0,210,255,0.2)' : 'none', color: form.accesos.telecom ? '#00d2ff' : 'white' }}
                                    >
                                        <Radio size={20} /> TELECOM
                                    </div>
                                </div>
                            </div>

                            <button style={styles.saveBtn} onClick={guardarUsuario}>
                                {editandoId ? "GUARDAR CAMBIOS" : "REGISTRAR NUEVO OPERARIO"}
                            </button>
                            {editandoId && <button style={{ ...styles.saveBtn, background: 'none', border: '1px solid #ff4444', color: '#ff4444' }} onClick={resetForm}>CANCELAR</button>}
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <h4 style={{ borderBottom: '1px solid rgba(0,210,255,0.3)', paddingBottom: '10px', fontSize: '14px' }}>PERSONAL REGISTRADO</h4>
                            {tecnicos.map(t => (
                                <div key={t.id} style={styles.userRow}>
                                    <div style={styles.userHeader}>
                                        <div>
                                            <strong style={{ fontSize: '16px' }}>{t.nombre}</strong>
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                {t.accesos.electricidad && <Zap size={12} color="#00d2ff" />}
                                                {t.accesos.clima && <Thermometer size={12} color="#00d2ff" />}
                                                {t.accesos.telecom && <Radio size={12} color="#00d2ff" />}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <Edit2 size={18} onClick={() => iniciarEdicion(t)} style={{ cursor: 'pointer', opacity: 0.7 }} />
                                            <Trash2 size={18} onClick={() => eliminarTecnico(t.id)} style={{ cursor: 'pointer', color: '#ff4444', opacity: 0.7 }} />
                                        </div>
                                    </div>
                                    <div style={styles.userDetails}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={12} /> {t.movil || '---'}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={12} /> {t.email || '---'}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Lock size={12} /> ********</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
