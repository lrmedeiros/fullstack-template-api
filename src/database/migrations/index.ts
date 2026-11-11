/**
 * Lista explícita de migrations, em ordem. Importar as classes (em vez de
 * usar glob) funciona igual em ESM, no build (dist/) e nos testes (Vitest).
 * Ao gerar uma migration nova, adicione-a aqui.
 */
import { InitialSchema1794422634150 } from './1794422634150-InitialSchema.js';

export const migrations = [InitialSchema1794422634150];
