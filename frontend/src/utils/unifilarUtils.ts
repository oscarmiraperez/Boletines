import { Device, UnifilarSchematic, UsoBase } from '../types/unifilar';

/**
 * Recursive helper to traverse the device tree.
 */
export function recorrerDispositivos(
    nodo: Device,
    callback: (n: Device) => void
): void {
    callback(nodo);
    if (Array.isArray(nodo.hijos)) {
        for (const hijo of nodo.hijos) {
            recorrerDispositivos(hijo, callback);
        }
    }
}

const USOS_CON_NUMERACION: UsoBase[] = [
    "Alumbrado",
    "Emergencias",
    "Otros usos",
    "Zonas húmedas",
    "Horno",
    "Lavadora",
    "Lavavajillas",
    "Termo",
    "Aire acondicionado"
];

/**
 * Ensures all labels in the schematic are correct.
 */
export function refrescarTodasLasEtiquetas(schematic: UnifilarSchematic): void {
    if (!schematic || !Array.isArray(schematic.cuadros)) return;
    for (const cuadro of schematic.cuadros) {
        for (const root of cuadro.dispositivos) {
            recorrerDispositivos(root, (nodo) => {
                if (nodo.tipo !== 'final_circuito') {
                    actualizarEtiquetaDispositivo(nodo);
                }
            });
        }
    }
}

/**
 * Recalculates circuit numbering and naming within each board.
 */
export function recalcularNumeracionCircuitos(schematic: UnifilarSchematic): void {
    if (!schematic || !Array.isArray(schematic.cuadros)) return;

    // First, ensure all MT/ID labels are correct
    refrescarTodasLasEtiquetas(schematic);

    for (const cuadro of schematic.cuadros) {
        const contadoresUso: Record<string, number> = {};
        for (const uso of USOS_CON_NUMERACION) {
            contadoresUso[uso] = 0;
        }

        let contadorCodigo = 0;
        const finales: Device[] = [];

        for (const raiz of cuadro.dispositivos) {
            recorrerDispositivos(raiz, (nodo) => {
                if (nodo.tipo === "final_circuito") {
                    finales.push(nodo);
                }
            });
        }

        for (const fin of finales) {
            const usoBase = fin.uso_base || 'Otros';
            contadorCodigo += 1;
            fin.codigo_circuito = "C" + contadorCodigo;

            if (usoBase === "Otros") {
                fin.nombre_circuito_final =
                    fin.nombre_circuito_usuario && fin.nombre_circuito_usuario.trim().length > 0
                        ? fin.nombre_circuito_usuario.trim()
                        : "Otros";
            } else if (USOS_CON_NUMERACION.includes(usoBase as UsoBase)) {
                contadoresUso[usoBase] = (contadoresUso[usoBase] || 0) + 1;
                const indice = contadoresUso[usoBase];
                fin.nombre_circuito_final = usoBase + " " + indice;
                fin.nombre_circuito_usuario = null;
            } else {
                fin.nombre_circuito_final = usoBase;
            }
            fin.etiqueta_texto = fin.nombre_circuito_final;
        }
    }
}

/**
 * Adjusts poles based on IGA.
 */
export function ajustarPolosSegunGeneral(schematic: UnifilarSchematic): void {
    if (!schematic || !Array.isArray(schematic.cuadros)) return;

    for (const cuadro of schematic.cuadros) {
        // Encontrar el IGA (Misión 3.1: etiqueta debe empezar por IGA)
        const iga = cuadro.dispositivos.find(d =>
            d.tipo === 'magnetotermico' &&
            d.etiqueta_texto?.toUpperCase().includes('IGA')
        );

        if (!iga) continue;

        if (iga.num_polos === 2) {
            // Force 2P on all descendants
            for (const root of cuadro.dispositivos) {
                recorrerDispositivos(root, (nodo) => {
                    if (nodo.tipo === 'magnetotermico' || nodo.tipo === 'diferencial') {
                        nodo.num_polos = 2;
                        // Update etiquetas immediately
                        actualizarEtiquetaDispositivo(nodo);
                    }
                });
            }
        }
    }
}

/**
 * Updates the etiqueta_texto based on current properties (Misión 3)
 */
export function actualizarEtiquetaDispositivo(nodo: Device): void {
    if (nodo.tipo === 'magnetotermico') {
        const isIGA = (nodo.etiqueta_texto?.toUpperCase() || '').includes('IGA');
        const typePrefix = isIGA ? 'IGA' : 'PIA';
        nodo.etiqueta_texto = `${typePrefix} ${nodo.num_polos}P ${nodo.calibre_A}A`;
    } else if (nodo.tipo === 'diferencial') {
        nodo.etiqueta_texto = `ID ${nodo.num_polos}P ${nodo.calibre_A}A ${nodo.sensibilidad_mA}mA ${nodo.tipo_diferencial || 'AC'}`;
    }
}


/**
 * Generates nomenclature text.
 */
export function generarTextoNomenclatura(datos: {
    tension: 230 | 400;
    seccion: number;
    material: 'Cu' | 'Al';
    aislamiento: string;
}): string {
    const prefijo = datos.tension === 230 ? '2x' : '4x';
    return `${prefijo}${datos.seccion} mm2 ${datos.material} ${datos.aislamiento} AS`;
}

/**
 * Converts a flat Cuadro structure (from UI) to the recursive Devices tree
 */
export function convertFlatToTree(cuadro: any): Device[] {
    const dispositivos: Device[] = [];

    // IGA (Main Breaker)
    if (cuadro.mainBreaker) {
        const iga: Device = {
            id: `iga-${Math.random().toString(36).substr(2, 9)}`,
            tipo: 'magnetotermico',
            num_polos: cuadro.mainBreaker.poles,
            calibre_A: cuadro.mainBreaker.amperage,
            etiqueta_texto: `IGA ${cuadro.mainBreaker.poles}P ${cuadro.mainBreaker.amperage}A`,
            hijos: []
        };
        dispositivos.push(iga);

        // All components (ID or standalone PIA) go under IGA
        const parent = iga;
        const rawComponents = cuadro.components || cuadro.differentials || [];

        rawComponents.forEach((comp: any) => {
            // Determine type: if it has 'tipo' property or if it comes from 'differentials' array
            const isID = comp.tipo === 'ID' || (!comp.tipo && comp.circuits);

            if (isID) {
                // Differential (ID)
                const dNode: Device = {
                    id: `dif-${Math.random().toString(36).substr(2, 9)}`,
                    tipo: 'diferencial',
                    num_polos: comp.poles || 2,
                    calibre_A: comp.amperage || 40,
                    sensibilidad_mA: comp.sensitivity || 30,
                    tipo_diferencial: comp.type_id || comp.type || 'AC',
                    etiqueta_texto: `ID ${comp.poles || 2}P ${comp.amperage || 40}A ${comp.sensitivity || 30}mA ${comp.type_id || comp.type || 'AC'}`,
                    hijos: []
                };
                parent.hijos.push(dNode);

                (comp.circuits || []).forEach((circ: any) => {
                    const mtNode: Device = {
                        id: `mt-${Math.random().toString(36).substr(2, 9)}`,
                        tipo: 'magnetotermico',
                        num_polos: circ.poles || 2,
                        calibre_A: circ.amperage || 16,
                        etiqueta_texto: `PIA ${circ.poles || 2}P ${circ.amperage || 16}A`,
                        hijos: []
                    };
                    dNode.hijos.push(mtNode);

                    const finalNode: Device = {
                        id: `final-${Math.random().toString(36).substr(2, 9)}`,
                        tipo: 'final_circuito',
                        nombre_circuito_final: circ.description || '',
                        seccion: circ.seccion || 2.5,
                        num_polos: circ.poles || 2,
                        calibre_A: circ.amperage || 16,
                        uso_base: circ.uso_base || 'Otros',
                        nombre_circuito_usuario: circ.nombre_circuito_usuario || null,
                        etiqueta_texto: circ.description || (circ.uso_base || 'Otros'),
                        hijos: []
                    };
                    mtNode.hijos.push(finalNode);
                });
            } else {
                // Standalone Magnetothermic (PIA)
                const mtNode: Device = {
                    id: `mt-${Math.random().toString(36).substr(2, 9)}`,
                    tipo: 'magnetotermico',
                    num_polos: comp.poles || 2,
                    calibre_A: comp.amperage || 16,
                    etiqueta_texto: `PIA ${comp.poles || 2}P ${comp.amperage || 16}A`,
                    hijos: []
                };
                parent.hijos.push(mtNode);

                const finalNode: Device = {
                    id: `final-${Math.random().toString(36).substr(2, 9)}`,
                    tipo: 'final_circuito',
                    nombre_circuito_final: comp.description || '',
                    seccion: comp.seccion || 2.5,
                    num_polos: comp.poles || 2,
                    calibre_A: comp.amperage || 16,
                    uso_base: comp.uso_base || 'Otros',
                    nombre_circuito_usuario: comp.nombre_circuito_usuario || null,
                    etiqueta_texto: comp.description || (comp.uso_base || 'Otros'),
                    hijos: []
                };
                mtNode.hijos.push(finalNode);
            }
        });
    }

    return dispositivos;
}

/**
 * Converts a recursive Devices tree back to flat Cuadro structure for the UI
 */
export function convertTreeToFlat(dispositivos: Device[]): any {
    const iga = dispositivos.find(d => d.tipo === 'magnetotermico');
    const flatCuadro: any = {
        mainBreaker: {
            poles: iga?.num_polos || 2,
            amperage: iga?.calibre_A || 40
        },
        components: [] // polymorphic list
    };

    if (iga && Array.isArray(iga.hijos)) {
        iga.hijos.forEach(compNode => {
            if (compNode.tipo === 'diferencial') {
                const circuits: any[] = [];
                const findFinals = (n: Device) => {
                    if (n.tipo === 'final_circuito') {
                        circuits.push({
                            poles: n.num_polos || 2,
                            amperage: n.calibre_A || 16,
                            description: n.nombre_circuito_final || '',
                            seccion: n.seccion || 2.5,
                            uso_base: n.uso_base || 'Otros',
                            nombre_circuito_usuario: n.nombre_circuito_usuario || null
                        });
                    } else if (n.hijos) {
                        n.hijos.forEach(findFinals);
                    }
                };
                compNode.hijos?.forEach(findFinals);

                flatCuadro.components.push({
                    tipo: 'ID',
                    poles: compNode.num_polos || 2,
                    amperage: compNode.calibre_A || 40,
                    sensitivity: compNode.sensibilidad_mA || 30,
                    type_id: compNode.tipo_diferencial || 'AC',
                    circuits
                });
            } else if (compNode.tipo === 'magnetotermico') {
                // Standalone PIA
                let finalInfo: any = {};
                const findFinal = (n: Device) => {
                    if (n.tipo === 'final_circuito') {
                        finalInfo = {
                            description: n.nombre_circuito_final || '',
                            seccion: n.seccion || 2.5,
                            uso_base: n.uso_base || 'Otros',
                            nombre_circuito_usuario: n.nombre_circuito_usuario || null
                        };
                    } else if (n.hijos) {
                        n.hijos.forEach(findFinal);
                    }
                };
                findFinal(compNode);

                flatCuadro.components.push({
                    tipo: 'PIA',
                    poles: compNode.num_polos || 2,
                    amperage: compNode.calibre_A || 16,
                    ...finalInfo
                });
            }
        });
    }

    // Maintain 'differentials' for backward compatibility if needed by other components
    flatCuadro.differentials = flatCuadro.components.filter((c: any) => c.tipo === 'ID');

    return flatCuadro;
}
