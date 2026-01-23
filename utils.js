export function uid(len = 12){
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i=0;i<len;i++) out += a[Math.floor(Math.random()*a.length)];
  return out;
}

export function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

export function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function copyToClipboard(text){
  return navigator.clipboard?.writeText(String(text)) ?? Promise.reject(new Error("Clipboard unavailable"));
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
