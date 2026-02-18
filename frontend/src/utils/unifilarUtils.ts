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
 * Recalculates circuit numbering and naming within each board.
 */
export function recalcularNumeracionCircuitos(schematic: UnifilarSchematic): void {
    if (!schematic || !Array.isArray(schematic.cuadros)) return;

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
            } else {
                fin.nombre_circuito_final = usoBase;
            }

            // etiqeta_texto should be equal to nombre_circuito_final for finals
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
        const iga = cuadro.dispositivos.find(d =>
            d.tipo === 'magnetotermico' &&
            d.etiqueta_texto?.toUpperCase().startsWith('IGA')
        );

        if (!iga) continue;

        if (iga.num_polos === 2) {
            // Force 2P on all descendants
            for (const root of cuadro.dispositivos) {
                recorrerDispositivos(root, (nodo) => {
                    if (nodo.tipo === 'magnetotermico' || nodo.tipo === 'diferencial') {
                        nodo.num_polos = 2;
                        // Update etiquetas
                        actualizarEtiquetaDispositivo(nodo);
                    }
                });
            }
        }
    }
}

/**
 * Updates the etiqueta_texto based on current properties
 */
export function actualizarEtiquetaDispositivo(nodo: Device): void {
    if (nodo.tipo === 'magnetotermico') {
        const type = nodo.etiqueta_texto?.toUpperCase().startsWith('IGA') ? 'IGA' : 'PIA';
        nodo.etiqueta_texto = `${type} ${nodo.num_polos}P ${nodo.calibre_A}A`;
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
            id_dispositivo: `iga-${Math.random().toString(36).substr(2, 9)}`,
            tipo: 'magnetotermico',
            num_polos: cuadro.mainBreaker.poles,
            calibre_A: cuadro.mainBreaker.amperage,
            etiqueta_texto: `IGA ${cuadro.mainBreaker.poles}P ${cuadro.mainBreaker.amperage}A`,
            hijos: []
        };
        dispositivos.push(iga);

        // All differentials go under IGA (or at root if no IGA)
        const parent = iga;

        (cuadro.differentials || []).forEach((diff: any) => {
            const dNode: Device = {
                id_dispositivo: `dif-${Math.random().toString(36).substr(2, 9)}`,
                tipo: 'diferencial',
                num_polos: diff.poles,
                calibre_A: diff.amperage,
                sensibilidad_mA: diff.sensitivity,
                tipo_diferencial: diff.type || 'AC',
                etiqueta_texto: `ID ${diff.poles}P ${diff.amperage}A ${diff.sensitivity}mA ${diff.type || 'AC'}`,
                hijos: []
            };
            parent.hijos.push(dNode);

            (diff.circuits || []).forEach((circ: any) => {
                const mtNode: Device = {
                    id_dispositivo: `mt-${Math.random().toString(36).substr(2, 9)}`,
                    tipo: 'magnetotermico',
                    num_polos: circ.poles,
                    calibre_A: circ.amperage,
                    etiqueta_texto: `PIA ${circ.poles}P ${circ.amperage}A`,
                    hijos: []
                };
                dNode.hijos.push(mtNode);

                const finalNode: Device = {
                    id_dispositivo: `final-${Math.random().toString(36).substr(2, 9)}`,
                    tipo: 'final_circuito',
                    nombre_circuito_final: circ.description,
                    seccion: circ.seccion || 2.5,
                    num_polos: circ.poles,
                    calibre_A: circ.amperage,
                    uso_base: circ.uso_base || 'Otros',
                    etiqueta_texto: circ.description || (circ.uso_base || 'Otros'),
                    hijos: []
                };
                mtNode.hijos.push(finalNode);
            });
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
        differentials: []
    };

    const traverseForDiffs = (node: Device) => {
        if (node.tipo === 'diferencial') {
            const circuits: any[] = [];

            const traverseForFinals = (n: any) => {
                if (n.tipo === 'final_circuito') {
                    circuits.push({
                        poles: n.num_polos || 2,
                        amperage: n.calibre_A || 16,
                        description: n.nombre_circuito_final || '',
                        seccion: n.seccion || 2.5,
                        uso_base: n.uso_base || 'Otros'
                    });
                } else if (n.hijos) {
                    n.hijos.forEach(traverseForFinals);
                }
            };

            node.hijos?.forEach(traverseForFinals);

            flatCuadro.differentials.push({
                poles: node.num_polos || 2,
                amperage: node.calibre_A || 40,
                sensitivity: node.sensibilidad_mA || 30,
                description: node.etiqueta_texto || '',
                circuits
            });
        } else if (node.hijos) {
            node.hijos.forEach(traverseForDiffs);
        }
    };

    dispositivos.forEach(traverseForDiffs);
    return flatCuadro;
}
