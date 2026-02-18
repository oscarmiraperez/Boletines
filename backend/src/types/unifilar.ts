export type DeviceType = 'derivacion' | 'magnetotermico' | 'diferencial' | 'final_circuito';

export type Amperage = 10 | 16 | 20 | 25 | 32 | 40 | 50 | 63 | 100 | 125 | 160 | 200 | 250 | 400 | 600;

export type Sensitivity = 30 | 300 | 500 | 'Reg' | null;

export type DifferentialType = 'AC' | 'A' | 'F' | 'B' | null;

export type UsoBase =
    | 'Alumbrado'
    | 'Emergencias'
    | 'Otros usos'
    | 'Zonas húmedas'
    | 'Horno'
    | 'Lavadora'
    | 'Lavavajillas'
    | 'Termo'
    | 'Aire acondicionado'
    | 'Otros';

export interface Device {
    id: string;
    tipo: DeviceType;
    num_polos: number | null;
    calibre_A: number | null;
    sensibilidad_mA?: number | string | null;
    tipo_diferencial?: DifferentialType;
    etiqueta_texto: string;
    hijos: Device[];
    seccion?: number;

    // final_circuito fields
    uso_base?: UsoBase;
    nombre_circuito_usuario?: string | null;
    nombre_circuito_final?: string;
    codigo_circuito?: string;
}

export interface Cuadro {
    id: string;
    name: string;
    dispositivos: Device[]; // Root devices in the tree
}

export interface DerivationData {
    tension: 230 | 400;
    seccion: number;
    material: 'Cu' | 'Al';
    aislamiento: string;
    texto_nomenclatura: string;
}

export interface UnifilarSchematic {
    id: string;
    origen: "boletin" | "editor_suelto";
    derivacion: DerivationData;
    cuadros: Cuadro[];
}
