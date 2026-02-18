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
    // "Otros" NO lleva numeración automática
];

/**
 * Recalculates circuit numbering and naming within each board.
 */
export function recalcularNumeracionCircuitos(schematic: UnifilarSchematic): void {
    if (!schematic || !Array.isArray(schematic.cuadros)) return;

    for (const cuadro of schematic.cuadros) {
        // Map: uso_base -> counter
        const contadoresUso: Record<string, number> = {};
        for (const uso of USOS_CON_NUMERACION) {
            contadoresUso[uso] = 0;
        }

        // Global counter for code_circuito (C1, C2, ...)
        let contadorCodigo = 0;

        const finales: Device[] = [];

        // Collect all final circuits of this board
        for (const raiz of cuadro.dispositivos) {
            recorrerDispositivos(raiz, (nodo) => {
                if (nodo.tipo === "final_circuito") {
                    finales.push(nodo);
                }
            });
        }

        // Assign names and codes
        for (const fin of finales) {
            const usoBase = fin.uso_base;
            if (!usoBase) continue;

            // Increment global counter C1, C2, C3...
            contadorCodigo += 1;
            fin.codigo_circuito = "C" + contadorCodigo;

            if (usoBase === "Otros") {
                // User free text, no automatic numbering
                fin.nombre_circuito_final =
                    fin.nombre_circuito_usuario && fin.nombre_circuito_usuario.trim().length > 0
                        ? fin.nombre_circuito_usuario.trim()
                        : "Otros";
            } else if (USOS_CON_NUMERACION.includes(usoBase)) {
                // Incremental numbering: Alumbrado 1, Alumbrado 2, ...
                contadoresUso[usoBase] = (contadoresUso[usoBase] || 0) + 1;
                const indice = contadoresUso[usoBase];
                fin.nombre_circuito_final = usoBase + " " + indice;
            } else {
                // Fallback for unexpected uso_base
                fin.nombre_circuito_final = usoBase;
            }

            // Update label text if needed
            fin.etiqueta_texto = fin.nombre_circuito_final || fin.etiqueta_texto;
        }
    }
}

/**
 * Adjusts poles of all descendants based on the main breaker (IGA).
 * If IGA is 2P, forces all descendants to be 2P.
 * If IGA is 4P, allows them to keep their value.
 */
export function ajustarPolosSegunGeneral(schematic: UnifilarSchematic): void {
    if (!schematic || !Array.isArray(schematic.cuadros)) return;

    for (const cuadro of schematic.cuadros) {
        // Detect main breaker (IGA)
        // Usually the first magnetothermic without a parent or with "IGA" label.
        // In this tree structure, we look at the roots.
        const iga = cuadro.dispositivos.find(d =>
            d.tipo === 'magnetotermico' &&
            (d.etiqueta_texto?.toUpperCase().includes('IGA') || true) // Taking the first root as a fallback
        );

        if (!iga) continue;

        if (iga.num_polos === 2) {
            // Force all descendants to 2P
            for (const root of cuadro.dispositivos) {
                // Start recursion from root, but we only force if it's not the IGA itself (which is already 2P)
                recorrerDispositivos(root, (nodo) => {
                    if (nodo.tipo === 'magnetotermico' || nodo.tipo === 'diferencial') {
                        nodo.num_polos = 2;
                    }
                });
            }
        }
    }
}

/**
 * Generates the nomenclature text for a derivation.
 * Format: "[prefix][seccion] mm2 [material] [aislamiento] AS"
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
 * Maps derivation data from an Expediente object to the Unifilar model.
 */
export function mapearDerivacionDesdeExpediente(expediente: any): {
    tension: 230 | 400;
    seccion: number;
    material: 'Cu' | 'Al';
    aislamiento: string;
    texto_nomenclatura: string;
} {
    const mtdJson = (expediente as any).mtdData || {};

    const tension = mtdJson.tensionNominal === '400' ? 400 : 230;
    const seccion = mtdJson.diSeccion || expediente.derivacion?.section || 6;
    const material = (mtdJson.diMaterial === 'al' || expediente.derivacion?.material === 'ALUMINIO') ? 'Al' : 'Cu';
    const aislamiento = mtdJson.diAislamiento || expediente.derivacion?.insulation || 'ES07Z1-K';

    const texto_nomenclatura = generarTextoNomenclatura({
        tension,
        seccion,
        material,
        aislamiento
    });

    return {
        tension,
        seccion,
        material,
        aislamiento,
        texto_nomenclatura
    };
}
