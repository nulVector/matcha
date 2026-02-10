export type VibeType = 'cyber' | 'nature' | 'tiny' | 'legendary' | 'chaos';

interface VibeLists {
  adjectives: string[];
  nouns: string[];
}

export const USERNAME_VIBES: Record<VibeType, VibeLists> = {
  cyber: {
    adjectives: ["Neon", "Ghost", "Shadow", "Pixel", "Cyber", "Bit", "Logic", "Static"],
    nouns: ["Runner", "Matrix", "Phantom", "Pulse", "Byte", "Void", "Glitch", "Signal"],
  },
  nature: {
    adjectives: ["Misty", "Wild", "Quiet", "Lunar", "Alpine", "Forest", "Solar", "Drift"],
    nouns: ["Wolf", "Peak", "River", "Moon", "Fern", "Valley", "Hawk", "Moss"],
  },
  tiny: {
    adjectives: ["Tiny", "Soft", "Fluffy", "Happy", "Little", "Sweet", "Sleepy", "Round"],
    nouns: ["Panda", "Mochi", "Bean", "Bunny", "Koala", "Cloud", "Otter", "Dino"],
  },
  legendary: {
    adjectives: ["Mighty", "Ancient", "Mystic", "Brave", "Iron", "Noble", "Grand", "Grim"],
    nouns: ["Knight", "Wizard", "Warden", "Scribe", "Drake", "Titan", "Blade", "Smith"],
  },
  chaos: {
    adjectives: ["Purple", "Dancing", "Nuclear", "Plastic", "Electric", "Funky", "Cosmic", "Salty"],
    nouns: ["Potato", "Umbrella", "Disco", "Rocket", "Cactus", "Lemon", "Toaster", "Waffle"],
  }
};