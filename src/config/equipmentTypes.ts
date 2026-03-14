// ============================================================
// GLOBAL EQUIPMENT TYPE DEFINITIONS
// Single source of truth for all equipment types, options,
// and defaults used across LNB, Switch, Motor, Unicable,
// Satellite screens AND Project Mapping screen.
// ============================================================

// --- LNB ---
export const DEFAULT_LNB_BANDS = ["NONE", "C-Band", "Ku-Band", "Ka-Band", "L-Band"];
export const LNB_POWER_CONTROLS = ["NONE", "Auto", "13V", "18V", "Off"];
export const LNB_V_CONTROLS = ["NONE", "Enabled", "Disabled"];
export const LNB_KHZ_OPTIONS = ["NONE", "Auto", "On", "Off"];

export const LNB_BAND_DEFAULTS: Record<string, { lowFrequency: string; highFrequency: string }> = {
  "C-Band": { lowFrequency: "3400", highFrequency: "4200" },
  "Ku-Band": { lowFrequency: "10700", highFrequency: "12750" },
  "Ka-Band": { lowFrequency: "18300", highFrequency: "20200" },
  "L-Band": { lowFrequency: "950", highFrequency: "2150" },
  "NONE": { lowFrequency: "", highFrequency: "" },
};

// --- Switch ---
export const DEFAULT_SWITCH_TYPES = ["Tone Burst", "DiSEqC 1.0", "DiSEqC 1.1"];

// --- Motor ---
export const DEFAULT_MOTOR_TYPES = ["DiSEqC 1.0", "DiSEqC 1.2"];
export const MOTOR_EAST_WEST = ["East", "West"];
export const MOTOR_NORTH_SOUTH = ["North", "South"];

// --- Unicable ---
export const DEFAULT_UNICABLE_TYPES = ["DSCR", "DCSS"];
export const UNICABLE_STATUS_OPTIONS = ["ON", "OFF"];
export const UNICABLE_PORT_OPTIONS = ["None", "A", "B"];
export const MAX_IF_SLOTS = 32;

// --- Satellite ---
export const SATELLITE_DIRECTIONS = ["East", "West"];
export const POLARIZATIONS = ["Horizontal", "Vertical", "Left Circular", "Right Circular"];
export const FEC_OPTIONS = ["1/2", "2/3", "3/4", "5/6", "7/8", "Auto"];
export const FEC_MODES = ["DVB-S", "DVB-S2", "DVB-S2X", "Auto"];

// --- Custom type categories ---
export type CustomTypeCategory = 'lnb_band' | 'switch_type' | 'motor_type' | 'unicable_type';

// Helper: merge default types with admin-managed custom types
export const getMergedTypes = (defaults: string[], customTypes: string[]): string[] => {
  const merged = [...defaults];
  customTypes.forEach(ct => {
    if (!merged.some(d => d.toLowerCase() === ct.toLowerCase())) {
      merged.push(ct);
    }
  });
  return merged;
};
