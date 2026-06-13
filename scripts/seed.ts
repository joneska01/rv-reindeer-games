/**
 * Production seed — populates the shared GAME LIBRARY only. Idempotent: inserts
 * any library game that doesn't already exist (matched by name), skips the rest.
 * Run: npm run seed   (with DATABASE_URL set)
 *
 * Historical years (2023/24/25) are NOT seeded here — they are museum exhibits
 * served from /seed-data/*.json (display-only). See the v3.1 design doc §4.
 */
import 'dotenv/config';
import { db } from '@/lib/db';
import { gameLibrary } from '@/db/schema';

type LibraryEntry = {
  name: string;
  scoreType: 'high_wins' | 'low_wins';
  scoreSource: 'manual' | 'voting';
  scoreUnit: string;
  defaultNumRounds: number;
  supplies: string;
  notes: string;
};

const LIBRARY: LibraryEntry[] = [
  { name: 'Wreath Toss', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'points', defaultNumRounds: 1, supplies: 'Wreath, ornaments', notes: 'Toss ornaments through wreath for score.' },
  { name: 'Rolo Stack', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'rolos', defaultNumRounds: 1, supplies: 'Rolos', notes: 'Stack Rolos into the shape of a tree.' },
  { name: 'Cotton Ball Shovel', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'balls', defaultNumRounds: 1, supplies: 'Cotton balls, spoon, bowl', notes: 'Spoon in mouth, move cotton balls between bowls.' },
  { name: 'Ornament Swing', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'points', defaultNumRounds: 1, supplies: 'Ornament on string, cups', notes: 'Swing ornament into cup at waist.' },
  { name: 'Ring Toss', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'rings', defaultNumRounds: 2, supplies: 'Antler headband, rings', notes: 'Toss rings onto partner wearing antlers.' },
  { name: 'Costume Contest', scoreType: 'high_wins', scoreSource: 'voting', scoreUnit: 'vote points', defaultNumRounds: 1, supplies: '', notes: 'Teams vote 1st/2nd/3rd. Points: 1st=10, 2nd=7, 3rd=5.' },
  { name: 'Cup-Ornament Flip', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'Cups, ornaments, ping pong balls', notes: 'Flip ornament off cup, catch in cup. Fastest time.' },
  { name: 'Candy Cane Fishing', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'canes', defaultNumRounds: 2, supplies: 'Candy canes, waist string, cups', notes: 'Hook candy canes from cup to cup. Most in 30s.' },
  { name: 'Snow Shoveling', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'balls', defaultNumRounds: 2, supplies: 'Cotton balls, spatula, bowl', notes: '30s, cotton balls into bowl, one utensil per round.' },
  { name: 'Marshmallow Straw', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'mallows', defaultNumRounds: 2, supplies: 'Mini marshmallows, straws, plates', notes: 'Suck mallows from plate to plate in 30s.' },
  { name: 'Ping Pong Kleenex Box', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'balls', defaultNumRounds: 2, supplies: 'Kleenex box, ping pong balls, belt', notes: 'Shake balls out of box tied to back. 30s.' },
  { name: 'Cup Pyramid', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 2, supplies: '10 cups, ball', notes: 'Stack cups into a pyramid with a ball on top. Fastest time.' },
  { name: 'Blowing Snowballs', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'Cotton balls, cups, noise maker', notes: 'Knock cotton balls off cups with a noise maker. Fastest time.' },
  { name: 'Stack the Sack', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'Cups, balloon', notes: 'Use a balloon to pick up and stack cups. Fastest time.' },
  { name: 'Candy Cane Zipline', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 1, supplies: 'Candy canes, string, cups', notes: 'Drop candy canes into cups via a string. Fastest time.' },
  { name: 'Ping Pong Hole in Lid', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'balls', defaultNumRounds: 1, supplies: 'Ping pong balls, cups with lids', notes: '' },
  { name: 'Hungry Hippos Reindeer Prance', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'points', defaultNumRounds: 1, supplies: '', notes: '' },
  { name: "Santa's Scooper", scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'points', defaultNumRounds: 1, supplies: '', notes: '' },
  { name: 'Candy Cane Scooping', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'canes', defaultNumRounds: 1, supplies: 'Candy canes, bowl', notes: '' },
  { name: 'Cup Stacking Contest', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 1, supplies: 'Cups', notes: '' },
  { name: 'Chimney Drop', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 1, supplies: '', notes: '' },
];

async function main() {
  console.log('🌱 Seeding game library...');

  const existing = await db.select({ name: gameLibrary.name }).from(gameLibrary);
  const existingNames = new Set(existing.map((g) => g.name));

  const toInsert = LIBRARY.filter((g) => !existingNames.has(g.name));

  if (toInsert.length === 0) {
    console.log(`  ↩ All ${LIBRARY.length} library games already present. Nothing to do.`);
  } else {
    await db.insert(gameLibrary).values(
      toInsert.map((g) => ({ ...g, instructions: '', scoringDescription: '' })),
    );
    console.log(`  ✓ Inserted ${toInsert.length} new library game(s):`);
    for (const g of toInsert) console.log(`      • ${g.name}`);
  }

  console.log('🎄 Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
