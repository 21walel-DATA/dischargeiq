// Full-page screenshots of static wireframes using the installed Chrome via the DevTools protocol.
// Usage: node shoot.mjs <designsDir> <page1> [page2 ...]   (page names without .html)
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [designsDir, ...pages] = process.argv.slice(2);
const sizes = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 375, height: 812, mobile: true },
];
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), "diq-shot-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}${path}`); return await r.json(); } catch { await sleep(200); }
  }
  throw new Error("Chrome did not start");
}

const targets = await getJson("/json/list");
const pageTarget = targets.find((t) => t.type === "page");
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else listeners.forEach((l) => l(msg));
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const waitFor = (method) => new Promise((r) => { const l = (m) => { if (m.method === method) { listeners.splice(listeners.indexOf(l), 1); r(m); } }; listeners.push(l); });

await send("Page.enable");
for (const page of pages) {
  for (const s of sizes) {
    await send("Emulation.setDeviceMetricsOverride", { width: s.width, height: s.height, deviceScaleFactor: 1, mobile: s.mobile });
    const loaded = waitFor("Page.loadEventFired");
    await send("Page.navigate", { url: pathToFileURL(join(designsDir, `${page}.html`)).href });
    await loaded;
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
    await sleep(300);
    const { result } = await send("Runtime.evaluate", { expression: "Math.ceil(document.documentElement.scrollHeight)", returnByValue: true });
    const fullHeight = Math.max(s.height, result.value);
    await send("Emulation.setDeviceMetricsOverride", { width: s.width, height: fullHeight, deviceScaleFactor: 1, mobile: s.mobile });
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: s.width, height: fullHeight, scale: 1 } });
    const out = join(designsDir, `${page}-${s.name}.png`);
    writeFileSync(out, Buffer.from(shot.data, "base64"));
    console.log(`${out}  ${s.width}x${fullHeight}`);
  }
}
ws.close();
chrome.kill();
