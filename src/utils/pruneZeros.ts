// Purpose: Utility to recursively prune absent or zero-like values from objects/arrays
/**
**************************
@params val: any
@return any | undefined

[FUNCTION] : Recursively remove properties or array elements that are considered "absent".
Absent values handled:
 - numeric 0
 - null, undefined
 - NaN
 - string forms: "null", "nan", and empty string

Returns the pruned value, or `undefined` if the entire value should be removed.

**************************
*/
export function pruneZeros(val: any): any | undefined {
  if (val === 0 || val === null || val === undefined) return undefined;
  if (typeof val === "number" && Number.isNaN(val)) return undefined;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    if (s === "null" || s === "nan" || s === "") return undefined;
  }

  if (Array.isArray(val)) {
    const arr = val.map((el) => pruneZeros(el)).filter((el) => el !== undefined);
    return arr.length > 0 ? arr : undefined;
  }

  if (val && typeof val === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(val)) {
      const pv = pruneZeros(v);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  return val;
}

export default pruneZeros;
