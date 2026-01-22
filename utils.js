export function nowISO(){
  return new Date().toISOString();
}

export function formatLocal(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
  }catch{
    return ts;
  }
}

export function downloadText(filename, text){
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function shareText({ title, text, url }){
  // Web Share API (best on iOS)
  if (navigator.share){
    try{
      await navigator.share({ title, text, url });
      return { ok: true };
    }catch(e){
      return { ok: false, error: e };
    }
  }
  // Fallback: copy URL
  if (url){
    await navigator.clipboard?.writeText(url);
    return { ok: true, fallback: "copied" };
  }
  return { ok: false, fallback: "none" };
}

export function parseCodesFromText(raw){
  // Accept CSV or TXT where codes are one-per-line
  // Also handles accidental commas/quotes by splitting on newlines first.
  const lines = raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  // If a "CSV" with one code per line, this is already good.
  // If a line has commas, take first cell (common export pattern).
  const codes = lines.map(line => line.split(",")[0].replaceAll('"', "").trim()).filter(Boolean);

  // Deduplicate while preserving order
  const seen = new Set();
  const out = [];
  for (const c of codes){
    const k = c.toUpperCase();
    if (!seen.has(k)){
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

export function makePasscodeURL(code){
  const c = encodeURIComponent(code);
  return `https://store.pokemongo.com/offer-redemption?passcode=${c}`;
}
