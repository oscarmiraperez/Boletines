import React from 'react';
import { Thermometer, ArrowLeft, Wind, Gauge } from 'lucide-react';

const ClimaMenu = ({ onBack }) => {
    const styles = {
        container: {
            width: '100%',
            maxWidth: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
        },
        header: {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '20px'
        },
        backBtn: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '10px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        title: {
            fontSize: '24px',
            margin: 0
        },
        grid: {
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            maxWidth: '500px'
        },
        toolCard: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '25px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={styles.title}><Thermometer size={24} inline /> Climatización</h2>
            </div>

            <div style={styles.grid}>
                <div className="glass-card" style={styles.toolCard} onClick={() => alert('Control de Frigorías en desarrollo...')}>
                    <Wind size={40} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>CÁLCULO FRIGORÍAS</span>
                </div>
                <div className="glass-card" style={styles.toolCard} onClick={() => alert('Presiones en desarrollo...')}>
                    <Gauge size={40} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>CONTROL PRESIONES</span>
                </div>
            </div>
        </div>
    );
};

export default ClimaMenu;
