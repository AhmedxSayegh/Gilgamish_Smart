import { damascusHotels } from "../services/damascusHotels.js";
import { createRuleBasedPlanner } from "../services/ruleBasedPlanner.js";
import { createGoogleRoutesService } from "../services/googleRoutesService.js";
import { createIgnavService } from "../services/ignavService.js";
import { createGooglePlacesService } from "../services/googlePlacesService.js";
import { createOllamaPlanner } from "../services/ollamaPlanner.js";
import { createSerpapiHotelsService } from "../services/serpapiHotelsService.js";
import { searchDemoCities } from "../../../shared/demoCities.mjs";

export function createProviders(config) {
  const modes = config.providerModes;
  const flights = createIgnavService(config);
  const hotels = createSerpapiHotelsService(config);
  return {
    mode: "live", modes, aiMode: modes.ai, plannerMode: modes.ai, hotels,
    flightBookingLinks: flights.bookingLinks,
    searchAirports: flights.searchAirports,
    travel: { destinations: searchDemoCities, flights: flights.flights, hotels: (trip, options) => trip.destinationCode === "DAM" && [3,4,5].includes(trip.preferences?.hotelStars) ? damascusHotels(trip, options) : hotels.hotels(trip, options) },
    routes: createGoogleRoutesService(config),
    places: createGooglePlacesService(config),
    ai: modes.ai === "qwen" ? createOllamaPlanner(config) : createRuleBasedPlanner(),
  };
}
