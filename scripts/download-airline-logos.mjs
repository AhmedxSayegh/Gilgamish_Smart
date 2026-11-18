import { readFile, mkdir, writeFile, access } from "node:fs/promises";
const directory = new URL("../frontend/public/images/airlines/", import.meta.url);
await mkdir(directory, { recursive: true });
const names = await readFile(new URL("../frontend/src/lib/airlineNames.js", import.meta.url), "utf8");
const codes = [...names.matchAll(/^\s+(?:"([A-Z0-9]{2})"|([A-Z0-9]{2})): \[/gm)].map(match => match[1] || match[2]);
const failed = [];
let saved = 0;
for (let offset = 0; offset < codes.length; offset += 6) {
  await Promise.all(codes.slice(offset, offset + 6).map(async code => {
    const file = new URL(`${code}.png`, directory);
    try { await access(file); return; } catch {}
    try {
      const response = await fetch(`https://images.kiwi.com/airlines/64/${code}.png`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Logo unavailable");
      await writeFile(file, Buffer.from(await response.arrayBuffer()));
      saved++;
    } catch { failed.push(code); }
  }));
}
console.log(JSON.stringify({ saved, unavailable: failed }));
