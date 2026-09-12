import {
  Baby, BellRing, Briefcase, Building2, ConciergeBell, Croissant, DoorOpen, Droplets, Dumbbell,
  Fish, Flower2, Footprints, Headset, Landmark, Languages, Martini, Palmtree, PawPrint, Plane,
  PlaneTakeoff, Ship, Shirt, SquareParking, Sprout, Sun, Sunrise, Sunset, Thermometer, TrainFront,
  Trees, UtensilsCrossed, Waves, Wifi, Wind, Zap,
} from 'lucide-react';

/**
 * Amenity + highlight icons are stored on the server as *names*, never as components, so
 * the API stays serialisable. This map is the single lookup, with a safe default so a new
 * amenity in the catalogue can never crash a page.
 */
const MAP = {
  Wifi, Waves, Flower2, UtensilsCrossed, Dumbbell, SquareParking, PlaneTakeoff, Croissant,
  PawPrint, Palmtree, BellRing, ConciergeBell, Ship, Headset, Shirt, Briefcase, Baby, Zap,
  Droplets, Thermometer, Martini, Fish, Sprout, Sun, Sunrise, Sunset, Landmark, Building2,
  TrainFront, Languages, DoorOpen, Trees, Footprints, Wind, Plane,
};

export function amenityIcon(name, fallback = Droplets) {
  return MAP[name] || fallback;
}

export default MAP;
