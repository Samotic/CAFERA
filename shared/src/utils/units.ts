import type { IngredientUnit, UnitSystem } from '../constants/enums.js';
import { formatAmount } from './scale.js';

/**
 * Metric <-> imperial display conversion.
 *
 * Only volume and mass convert; `shot`, `tsp`, `tbsp`, `piece` and `pinch` are
 * already system-neutral in a kitchen context and are passed through unchanged.
 * Conversion happens at render time only — stored amounts are always metric, so
 * the database never carries two units of truth for the same ingredient.
 */

const ML_PER_FL_OZ = 29.5735;
const G_PER_OZ = 28.3495;

export interface DisplayAmount {
  value: number;
  unit: string;
  /** Pre-rendered `1 1/2 shot`, ready to drop into a label. */
  text: string;
}

function roundForDisplay(value: number): number {
  if (value >= 10) return Math.round(value);
  if (value >= 1) return Number(value.toFixed(1));
  return Number(value.toFixed(2));
}

export function toDisplayAmount(
  amount: number,
  unit: IngredientUnit,
  system: UnitSystem,
): DisplayAmount {
  if (system === 'metric' || (unit !== 'ml' && unit !== 'g')) {
    return { value: amount, unit, text: `${formatAmount(amount)} ${unit}`.trim() };
  }

  if (unit === 'ml') {
    const flOz = roundForDisplay(amount / ML_PER_FL_OZ);
    return { value: flOz, unit: 'fl oz', text: `${formatAmount(flOz)} fl oz` };
  }

  const oz = roundForDisplay(amount / G_PER_OZ);
  return { value: oz, unit: 'oz', text: `${formatAmount(oz)} oz` };
}

/** `95` -> `95 mg`, `undefined` -> `null` so callers can skip the row entirely. */
export function formatCaffeine(mg: number | undefined): string | null {
  return typeof mg === 'number' && mg > 0 ? `${Math.round(mg)} mg` : null;
}

export function formatCalories(kcal: number | undefined): string | null {
  return typeof kcal === 'number' && kcal >= 0 ? `${Math.round(kcal)} kcal` : null;
}

/** `10` -> `10 min`. Long recipes read better in hours. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** Minutes -> ISO-8601 duration, required by schema.org Recipe structured data. */
export function toIsoDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `PT${mins}M`;
  return mins === 0 ? `PT${hours}H` : `PT${hours}H${mins}M`;
}

/** Seconds -> `MM:SS`, the Brew Mode timer format. */
export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
