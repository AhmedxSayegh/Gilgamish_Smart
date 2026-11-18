// Run manually to refresh Commons images and their attribution metadata; optional city codes limit the refresh.
import { mkdir, readFile, writeFile } from "node:fs/promises";
const files = {
  MED: "Mosque of Prophet Muhammad SAW - panoramio.jpg",
  QCA: "Kaaba at night in 2024.jpg",
  JED: "King Fahd's Fountain Jeddah Fountain (5129797428).jpg",
  AMM: "Panoramic view of Amman.jpg",
  RUH: "Riyadh Skyline.jpg",
};
const clean = (text = "") =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
const metadataPath = new URL(
  "../frontend/src/lib/guideImageCredits.json",
  import.meta.url,
);
const credits = JSON.parse(
  await readFile(metadataPath, "utf8").catch(() => "{}"),
);
await mkdir(new URL("../frontend/public/assets/guides/", import.meta.url), {
  recursive: true,
});
for (const [code, title] of Object.entries(files)) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(code))
    continue;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    titles: `File:${title}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1280",
  });
  const res = await fetch(url, {
    headers: {
      "User-Agent": "GilgamishSmartDemo/1.0 (city guide image attribution)",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok)
    throw new Error(`Commons metadata returned ${res.status} for ${code}`);
  const data = await res.json();
  const info = Object.values(data.query.pages)[0].imageinfo?.[0];
  if (!info?.thumburl) throw new Error(`Missing image for ${code}`);
  const meta = info.extmetadata;
  const license = clean(meta.LicenseShortName?.value);
  if (!/CC BY|CC0|Public domain/i.test(license))
    throw new Error(`Review license before downloading ${code}`);
  const image = await fetch(info.thumburl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!image.ok || !image.headers.get("content-type")?.startsWith("image/"))
    throw new Error(`Image download failed for ${code}: ${image.status}`);
  await writeFile(
    new URL(
      `../frontend/public/assets/guides/${code.toLowerCase()}.jpg`,
      import.meta.url,
    ),
    Buffer.from(await image.arrayBuffer()),
  );
  credits[code] = {
    src: `/assets/guides/${code.toLowerCase()}.jpg`,
    author: clean(meta.Artist?.value),
    license,
    licenseUrl: meta.LicenseUrl?.value,
    sourceUrl: info.descriptionurl,
  };
  console.log(`${code}: image downloaded; ${license}`);
}
await writeFile(metadataPath, JSON.stringify(credits, null, 2));
