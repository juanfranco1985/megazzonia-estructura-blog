import { safeJsonParse } from "./utils.js";

function hasBridge() {
  return typeof window !== "undefined" && window.AndroidBridge && typeof window.AndroidBridge.readAsset === "function";
}

export async function readTextAsset(path) {
  if (hasBridge()) {
    const text = window.AndroidBridge.readAsset(path);
    if (text) {
      return text;
    }
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load asset: ${path}`);
  }
  return response.text();
}

export async function readJsonAsset(path) {
  const text = await readTextAsset(path);
  const parsed = safeJsonParse(text, null);
  if (!parsed) {
    throw new Error(`Invalid JSON asset: ${path}`);
  }
  return parsed;
}

export async function readTextAssets(paths) {
  const entries = await Promise.all(paths.map(async (path) => [path, await readTextAsset(path)]));
  return Object.fromEntries(entries);
}
