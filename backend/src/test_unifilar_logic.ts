import { UnifilarSchematic } from './types/unifilar';
import { recalcularNumeracionCircuitos, ajustarPolosSegunGeneral } from './utils/unifilarUtils';
import fs from 'fs';
import path from 'path';

const examplePath = path.join(__dirname, 'types/example_unifilar.json');
const exampleText = fs.readFileSync(examplePath, 'utf8');
const schematic: UnifilarSchematic = JSON.parse(exampleText);

console.log("--- BEFORE RECALCULATION ---");
console.log(JSON.stringify(schematic.cuadros[0].dispositivos, null, 2));

// Force IGA to 2P for testing poles adjustment
schematic.cuadros[0].dispositivos[0].num_polos = 2;

recalcularNumeracionCircuitos(schematic);
ajustarPolosSegunGeneral(schematic);

console.log("\n--- AFTER RECALCULATION & POLE ADJUSTMENT ---");
console.log(JSON.stringify(schematic.cuadros[0].dispositivos, null, 2));

// Save the updated version to verify
const updatedPath = path.join(__dirname, 'types/updated_example_unifilar.json');
fs.writeFileSync(updatedPath, JSON.stringify(schematic, null, 2));
console.log(`\nUpdated schematic saved to ${updatedPath}`);
