import { cities } from "./assets";
import imageCredits from "./guideImageCredits.json";

import { guideContent } from "../../../shared/guideContent.mjs";
export { guideReviewedAt, guideSectionLabels } from "../../../shared/guideContent.mjs";
export const cityGuides = cities.map(city => ({
  ...city, ...guideContent(city),
  image: imageCredits[city.code]?.src || city.image,
  imageCredit: imageCredits[city.code],
}));
export const guideForSlug = (slug) =>
  cityGuides.find((guide) => guide.slug === slug);
