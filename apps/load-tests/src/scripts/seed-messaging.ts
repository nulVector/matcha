import { seedFriendPairs } from './seed-friend-pairs';

seedFriendPairs({ withMatchProfile: false })
  .catch((err) => { 
    console.error("Seeding failed:", err); 
    process.exit(1); 
  }); 