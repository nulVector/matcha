export const INTERESTS = [
  // Tech & Hustle
  { name: "coding", category: "Tech & Hustle", emoji: "💻" },
  { name: "design", category: "Tech & Hustle", emoji: "🎨" },
  { name: "startups", category: "Tech & Hustle", emoji: "🚀" },
  { name: "crypto", category: "Tech & Hustle", emoji: "🪙" },
  { name: "investing", category: "Tech & Hustle", emoji: "📈" },
  // Gaming
  { name: "co-op gaming", category: "Gaming", emoji: "🤝" },
  { name: "fps games", category: "Gaming", emoji: "🎯" },
  { name: "cozy gaming", category: "Gaming", emoji: "🪴" },
  { name: "tabletop games", category: "Gaming", emoji: "🎲" },
  { name: "esports", category: "Gaming", emoji: "🏆" },
  // Fitness & Sports
  { name: "weightlifting", category: "Fitness & Sports", emoji: "🏋️" },
  { name: "running", category: "Fitness & Sports", emoji: "🏃" },
  { name: "yoga", category: "Fitness & Sports", emoji: "🧘" },
  { name: "martial arts", category: "Fitness & Sports", emoji: "🥋" },
  { name: "cricket", category: "Fitness & Sports", emoji: "🏏" },
  { name: "football", category: "Fitness & Sports", emoji: "⚽" },
  { name: "basketball", category: "Fitness & Sports", emoji: "🏀" },
  { name: "tennis", category: "Fitness & Sports", emoji: "🎾" },
  { name: "f1", category: "Fitness & Sports", emoji: "🏎️" },
  { name: "motorcycling", category: "Fitness & Sports", emoji: "🏍️" },
  // Arts & Vibes
  { name: "street photography", category: "Arts & Vibes", emoji: "📸" },
  { name: "digital art", category: "Arts & Vibes", emoji: "🖥️" },
  { name: "painting", category: "Arts & Vibes", emoji: "🖌️" },
  { name: "creative writing", category: "Arts & Vibes", emoji: "✍️" },
  { name: "diy crafting", category: "Arts & Vibes", emoji: "✂️" },
  // Music
  { name: "indie rock", category: "Music", emoji: "🎸" },
  { name: "live gigs", category: "Music", emoji: "🎫" },
  { name: "edm", category: "Music", emoji: "🎛️" },
  { name: "hip hop", category: "Music", emoji: "🎤" },
  { name: "pop", category: "Music", emoji: "🌟" },
  { name: "bollywood", category: "Music", emoji: "🪘" },
  { name: "making music", category: "Music", emoji: "🎹" },
  // Screen & Stage
  { name: "film & cinema", category: "Screen & Stage", emoji: "🍿" },
  { name: "anime", category: "Screen & Stage", emoji: "🎌" },
  { name: "k-dramas", category: "Screen & Stage", emoji: "🫰" },
  { name: "standup comedy", category: "Screen & Stage", emoji: "🎭" },
  { name: "podcasts", category: "Screen & Stage", emoji: "🎙️" },
  { name: "memes & culture", category: "Screen & Stage", emoji: "🤡" },
  // Food & Drinks
  { name: "coffee snobs", category: "Food & Drinks", emoji: "☕" },
  { name: "foodies", category: "Food & Drinks", emoji: "🌮" },
  { name: "cooking", category: "Food & Drinks", emoji: "👨‍🍳" },
  { name: "baking", category: "Food & Drinks", emoji: "🧁" },
  { name: "mixology", category: "Food & Drinks", emoji: "🍸" },
  // Out & About
  { name: "backpacking", category: "Out & About", emoji: "🎒" },
  { name: "sneakerheads", category: "Out & About", emoji: "👟" },
  { name: "thrifting", category: "Out & About", emoji: "🛍️" },
  // Deep Dives
  { name: "deep talks", category: "Deep Dives", emoji: "💭" },
  { name: "history", category: "Deep Dives", emoji: "🏛️" },
  { name: "philosophy", category: "Deep Dives", emoji: "🦉" },
  { name: "psychology", category: "Deep Dives", emoji: "🧠" },
  { name: "astronomy", category: "Deep Dives", emoji: "🔭" },
  { name: "fiction books", category: "Deep Dives", emoji: "📚" },
  { name: "non-fiction", category: "Deep Dives", emoji: "📖" },
  // Pets
  { name: "dog people", category: "Pets", emoji: "🐕" },
  { name: "cat people", category: "Pets", emoji: "🐈" }
];

export const MASTER_INTERESTS_LIST = INTERESTS.map((i) => i.name);

export const VIBE_OPTIONS = ['cyber', 'nature', 'tiny', 'legendary', 'chaos'] as const;