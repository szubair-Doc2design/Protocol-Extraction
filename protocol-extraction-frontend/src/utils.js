export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function countFields(obj) {
  let total = 0;
  let filled = 0;

  function isFilled(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === "string" && val.trim() === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }

  function walk(v) {
    if (v === null || v === undefined) { total += 1; return; }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      total += 1;
      if (isFilled(v)) filled += 1;
      return;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) { total += 1; return; }
      for (let item of v) walk(item);
      return;
    }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      if (keys.length === 0) { total += 1; return; }
      for (let k of keys) walk(v[k]);
    }
  }

  walk(obj);
  return { total, filled };
}
