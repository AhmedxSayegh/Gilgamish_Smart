import guideImages from "./guideImageCredits.json" with { type: "json" };
import { demoCities } from "../../../shared/demoCities.mjs";
const base = "/assets/figma/";
export const assets = {
  logo: base + "40db0.png",
  hero: base + "778da.png",
  damascus: base + "7613c.png",
  mosque: base + "2de66.png",
  souks: base + "ecc0e.png",
  food: base + "94a11.png",
  istanbul: base + "51874.png",
  riyadh: "/assets/guides/ruh.jpg",
  dubai: base + "d1ba5.png",
  cairo: base + "9a05c.png",
  paris: base + "73f85.png",
  destinationPlaceholder: "/assets/city-placeholder.svg",
};
export const icons = {
  sparkle: "5a7cc.svg",
  arrow: "79d9a.svg",
  location: "74fde.svg",
  budget: "2f677.svg",
  calendar: "bdd47.svg",
  generate: "7e018.svg",
  ai: "32110.svg",
  heritage: "ef022.svg",
  wallet: "83cb1.svg",
  bilingual: "39968.svg",
  arrowBrown: "588b6.svg",
  brand: "c6081.svg",
  language: "d103f.svg",
  email: "6a691.svg",
  phone: "11996.svg",
  office: "64617.svg",
  bookmark: "9d7e4.svg",
  heart: "3b303.svg",
  chevronUp: "6cc1a.svg",
  chevronDown: "898bc.svg",
  save: "0cf42.svg",
  modify: "5742b.svg",
  refresh: "62c4c.svg",
  book: "f92f7.svg",
  clock: "8ed46.svg",
  place: "983c3.svg",
  star: "db057.svg",
};
export const iconUrl = (name) => base + icons[name];
Object.assign(icons, {
  overview: "9d7e4.svg",
  savedCount: "3b303.svg",
  bookmark: "6cc1a.svg",
  heart: "898bc.svg",
  chevronUp: "05fdb.svg",
  chevronDown: "8ff7f.svg",
});
const cityImages = {
  DAM: [assets.damascus, base + "168a8.png"], IST: [assets.istanbul, base + "f3926.png"],
  RUH: [assets.riyadh, assets.riyadh], DXB: [assets.dubai, base + "1774d.png"],
  CAI: [assets.cairo, base + "726cd.png"], PAR: [assets.paris, base + "9bdcd.png"],
};
export const cities = demoCities.map((city) => ({ ...city, ar: city.nameAr,
  image: cityImages[city.code]?.[0] || guideImages[city.code]?.src || assets.destinationPlaceholder,
  dashboard: cityImages[city.code]?.[1] || guideImages[city.code]?.src || assets.destinationPlaceholder,
}));
export const cityFor = (code) => cities.find((c) => c.code === code);
export const safeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};
