import { createMockServices } from "./mockServices.js";
import { createAmadeusService } from "../services/amadeusService.js";
import { createGooglePlacesService } from "../services/googlePlacesService.js";
import { createAiService } from "../services/aiService.js";
export function createProviders(config) {
  return config.mock
    ? createMockServices()
    : {
        mode: "live",
        travel: createAmadeusService(config),
        places: createGooglePlacesService(config),
        ai: createAiService(config),
      };
}
