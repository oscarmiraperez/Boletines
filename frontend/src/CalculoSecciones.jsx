import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Zap, Info, CheckCircle } from 'lucide-react';

const CalculoSecciones = ({ onBack }) => {
    const [tipoLinea, setTipoLinea] = useState('interior'); // interior, di, motor
    const [usoInterior, setUsoInterior] = useState('otros');
    const [tipoContador, setTipoContador] = useState('centralizado');
    const [metodoInstalacion, setMetodoInstalacion] = useState('tubo'); // tubo, bandeja, enterrado
    const [modoCalculo, setModoCalculo] = useState('potencia');
    const [fases, setFases] = useState('monofasica');
    const [material, setMaterial] = useState('cobre');
    const [aislamiento, setAisalamiento] = useState('XLPE');
    const [valorEntrada, setValorEntrada] = useState('');
    const [longitud, setLongitud] = useState('');
    const [cosPhi, setCosPhi] = useState('1');
    const [resultado, setResultado] = useState(null);

    // Tablas de Intensidades Admisibles (Cobre, Tres conductores cargados, ITC-BT-19)
    const intensidadesCu = {
        XLPE: { // 90°C
            tubo: { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 66, 25: 84, 35: 104, 50: 125, 70: 160, 95: 194, 120: 225 },
            bandeja: { 1.5: 18.5, 2.5: 25, 4: 34, 6: 43, 10: 60, 16: 80, 25: 106, 35: 131, 50: 159, 70: 202, 95: 244, 120: 282 },
            enterrado: { 1.5: 22, 2.5: 29, 4: 38, 6: 47, 10: 63, 16: 81, 25: 104, 35: 125, 50: 150, 70: 185, 95: 215, 120: 245 }
        },
        PVC: { // 70°C
            tubo: { 1.5: 14.5, 2.5: 19.5, 4: 26, 6: 34, 10: 46, 16: 61, 25: 80, 35: 99, 50: 119, 70: 151, 95: 182, 120: 210 },
            bandeja: { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232, 120: 269 },
            enterrado: { 1.5: 18, 2.5: 24, 4: 31, 6: 39, 10: 52, 16: 67, 25: 86, 35: 103, 50: 122, 70: 151, 95: 178, 120: 203 }
        }
    };

    // Limpiar resultado al cambiar parámetros
    useEffect(() => {
        setResultado(null);
    }, [tipoLinea, modoCalculo, metodoInstalacion, fases, aislamiento]);

    const seccionesComerciales = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

    const calcular = () => {
        const valor = parseFloat(valorEntrada);
        const L = parseFloat(longitud);
        const cos = parseFloat(cosPhi);

        if (!valor || !L) {
            alert("Por favor, introduce la carga y la longitud.");
            return;
        }

        const V = fases === 'monofasica' ? 230 : 400;
        const conductividad = material === 'cobre' ? (aislamiento === 'XLPE' ? 44 : 48) : (aislamiento === 'XLPE' ? 28 : 31);

        let I, P;
        if (modoCalculo === 'potencia') {
            P = valor * 1000;
            I = fases === 'monofasica' ? P / (V * cos) : P / (Math.sqrt(3) * V * cos);
        } else {
            I = valor;
            P = fases === 'monofasica' ? V * I * cos : Math.sqrt(3) * V * I * cos;
        }

        let I_diseno = I;
        if (tipoLinea === 'motor') {
            I_diseno = I * 1.25;
        }

        let maxCdt = 5;
        if (tipoLinea === 'di') {
            maxCdt = tipoContador === 'centralizado' ? 1 : 1.5;
        } else if (tipoLinea === 'interior') {
            maxCdt = usoInterior === 'alumbrado' ? 3 : 5;
        } else {
            maxCdt = 5;
        }

        const maxVolts = (maxCdt / 100) * V;
        const gamma = conductividad;
        const e = maxVolts;
        let sCdt = fases === 'monofasica' ? (2 * L * P) / (gamma * e * V) : (L * P) / (gamma * e * V);

        const tablaI = intensidadesCu[aislamiento][metodoInstalacion];
        let sFinal = seccionesComerciales.find(s => s >= sCdt && (tablaI[s] || 9999) > I_diseno);

        setResultado({
            intensidad: I.toFixed(2),
            intensidadDiseno: I_diseno.toFixed(2),
            seccionPorCdt: sCdt.toFixed(2),
            seccionFinal: sFinal || 'No encontrada',
            caidaV: maxVolts.toFixed(2),
            cdtPorcentaje: maxCdt,
            esMotor: tipoLinea === 'motor'
        });
    };

    const styles = {
        card: { background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' },
        input: { width: '100%', padding: '12px', paddingRight: '45px', borderRadius: '8px', border: '1px solid #00d2ff', background: 'rgba(0,51,102,0.6)', color: 'white', marginTop: '10px', fontSize: '14px', boxSizing: 'border-box' },
        label: { fontSize: '12px', color: '#00d2ff', fontWeight: 'bold', display: 'block', marginTop: '15px', letterSpacing: '1px' },
        calcBtn: { width: '100%', padding: '15px', background: '#00d2ff', color: '#1a3c5a', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', fontSize: '16px' },
        resultBox: { background: 'rgba(0,210,255,0.1)', padding: '20px', borderRadius: '15px', marginTop: '20px', border: '1px solid #00d2ff' },
        toggleContainer: { display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '20px', padding: '4px', border: '1px solid rgba(0,210,255,0.3)' },
        toggleBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
        unitTag: { position: 'absolute', right: '12px', bottom: '11px', fontSize: '11px', color: 'white', fontWeight: 'bold', opacity: 0.8, pointerEvents: 'none' }
    };

    return (
        <div style={{ width: '100%', maxWidth: '500px', paddingBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ArrowLeft /></button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>CÁLCULO DE SECCIONES</h2>
                    <span style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>DI / INTERIOR / INDUSTRIA (REBT)</span>
                </div>
            </div>

            <div style={styles.card}>
                <label style={styles.label}>TIPO DE INSTALACIÓN</label>
                <select style={styles.input} value={tipoLinea} onChange={e => setTipoLinea(e.target.value)}>
                    <option value="interior">📍 CIRCUITO INTERIOR (Viviendas/Locales)</option>
                    <option value="di">⚡ DERIVACIÓN INDIVIDUAL (Contador a Cuadro)</option>
                    <option value="motor">⚙️ INDUSTRIA / MOTORES (125% Regla)</option>
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: tipoLinea === 'motor' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label style={styles.label}>TENSIÓN</label>
                        <select style={{ ...styles.input, paddingRight: '10px' }} value={fases} onChange={e => setFases(e.target.value)}>
                            <option value="monofasica">230V</option>
                            <option value="trifasica">400V</option>
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>AISLAMIENTO</label>
                        <select style={{ ...styles.input, paddingRight: '10px' }} value={aislamiento} onChange={e => setAisalamiento(e.target.value)}>
                            <option value="XLPE">XLPE</option>
                            <option value="PVC">PVC</option>
                        </select>
                    </div>
                    {tipoLinea === 'motor' && (
                        <div style={{ position: 'relative' }}>
                            <label style={styles.label}>COS φ</label>
                            <input style={{ ...styles.input, paddingRight: '45px' }} type="number" step="0.01" min="0" max="1" value={cosPhi} onChange={e => setCosPhi(e.target.value)} placeholder="1.0" />
                            <span style={styles.unitTag}>cos φ</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'end' }}>
                    <div>
                        <label style={styles.label}>MÉTODO INSTALACIÓN</label>
                        <select style={styles.input} value={metodoInstalacion} onChange={e => setMetodoInstalacion(e.target.value)}>
                            <option value="tubo">Bajo Tubo (B1)</option>
                            <option value="bandeja">Bandeja Aire (E)</option>
                            <option value="enterrado">Enterrado (D)</option>
                        </select>
                    </div>
                    {tipoLinea === 'interior' && (
                        <div>
                            <label style={styles.label}>USO CIRCUITO</label>
                            <select style={styles.input} value={usoInterior} onChange={e => setUsoInterior(e.target.value)}>
                                <option value="otros">🔌 OTROS (5%)</option>
                                <option value="alumbrado">💡 LUZ (3%)</option>
                            </select>
                        </div>
                    )}
                    {tipoLinea === 'di' && (
                        <div>
                            <label style={styles.label}>CONTADORES</label>
                            <select style={styles.input} value={tipoContador} onChange={e => setTipoContador(e.target.value)}>
                                <option value="centralizado">🏢 CENTR. (1%)</option>
                                <option value="individual">🏠 INDIV. (1.5%)</option>
                            </select>
                        </div>
                    )}
                </div>

                <div style={styles.toggleContainer}>
                    <button
                        style={{ ...styles.toggleBtn, backgroundColor: modoCalculo === 'potencia' ? '#00d2ff' : 'transparent', color: modoCalculo === 'potencia' ? '#1a3c5a' : 'white' }}
                        onClick={() => setModoCalculo('potencia')}
                    >
                        <Zap size={14} /> POTENCIA (kW)
                    </button>
                    <button
                        style={{ ...styles.toggleBtn, backgroundColor: modoCalculo === 'intensidad' ? '#00d2ff' : 'transparent', color: modoCalculo === 'intensidad' ? '#1a3c5a' : 'white' }}
                        onClick={() => setModoCalculo('intensidad')}
                    >
                        <Calculator size={14} /> AMPERIOS (A)
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '5px' }}>
                    <div style={{ position: 'relative' }}>
                        <label style={styles.label}>CARGA</label>
                        <input style={styles.input} type="number" step="any" value={valorEntrada} onChange={e => setValorEntrada(e.target.value)} placeholder="0.00" />
                        <span style={styles.unitTag}>{modoCalculo === 'potencia' ? 'kW' : 'A'}</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <label style={styles.label}>LONGITUD</label>
                        <input style={styles.input} type="number" step="any" value={longitud} onChange={e => setLongitud(e.target.value)} placeholder="0" />
                        <span style={styles.unitTag}>mts</span>
                    </div>
                </div>

                <button style={styles.calcBtn} onClick={calcular}>
                    CALCULAR SECCIÓN <Calculator size={18} style={{ marginLeft: '10px' }} />
                </button>
            </div>

            {resultado && (
                <div style={styles.resultBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#00d2ff' }}> RESULTADO </h3>
                        <CheckCircle color="#00d2ff" />
                    </div>

                    <div style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', margin: '20px 0' }}>
                        {resultado.seccionFinal} mm²
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', opacity: 0.9 }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <strong>Intensidad:</strong><br />{resultado.intensidad} A
                            {resultado.esMotor && <><br /><span style={{ fontSize: '10px' }}>(Diseño: {resultado.intensidadDiseno} A)</span></>}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <strong>Cdt Máx:</strong><br />{resultado.cdtPorcentaje}% ({resultado.caidaV}V)
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <strong>Método:</strong><br />{metodoInstalacion.toUpperCase()}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <strong>Material:</strong><br />{material.toUpperCase()}
                        </div>
                    </div>
                    <p style={{ fontSize: '11px', marginTop: '15px', color: '#00d2ff', display: 'flex', gap: '5px' }}>
                        <Info size={14} /> ITC-BT-19/20/47. Factor motor 1.25 incluido.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CalculoSecciones;
