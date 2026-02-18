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
    id_dispositivo: string;
    tipo: DeviceType;
    num_polos: 2 | 4;
    calibre_A: Amperage;
    sensibilidad_mA?: Sensitivity;
    tipo_diferencial?: DifferentialType;
    etiqueta_texto?: string;
    hijos?: Device[];
    seccion?: number;

    // final_circuito fields
    uso_base?: UsoBase;
    nombre_circuito_usuario?: string;
    nombre_circuito_final?: string;
    codigo_circuito?: string;
}

export interface Cuadro {
    id_cuadro: string;
    nombre_cuadro: string;
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
    derivacion: DerivationData;
    cuadros: Cuadro[];
}
