export const haramMinutes = 180;

export function isGrandMosque(place) {
  const name = (place?.name || "").normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^\p{L}]/gu, "");
  return Math.abs(place?.latitude - 21.4225) < .007 && Math.abs(place?.longitude - 39.8262) < .007 &&
    ["المسجدالحرام", "الحرمالمكي", "الحرمالمكيالشريف", "masjidalharam", "almasjidalharam",
      "almasjidalharaam", "grandmosque", "thegrandmosque", "greatmosqueofmecca", "masjidilharam"].includes(name);
}
