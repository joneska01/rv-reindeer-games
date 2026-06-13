/**
 * Dev seed — inserts a test year (9999) with sample teams, games, and the full
 * 21-game library. Idempotent: safe to re-run. Does NOT insert historical data.
 * Run: npm run seed:dev
 */
import 'dotenv/config';
import { db } from '@/lib/db';
import { years, teams, games, gameLibrary } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 Seeding dev data...');

  // ── Game library ────────────────────────────────────────────────────────────
  const existing = await db.select({ id: gameLibrary.id }).from(gameLibrary).limit(1);
  if (existing.length === 0) {
    const libraryGames = [
      { name: 'Wreath Toss', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'points', defaultNumRounds: 1, supplies: 'Wreath, ornaments', notes: 'Toss ornaments through wreath.' },
      { name: 'Rolo Stack', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'rolos', defaultNumRounds: 1, supplies: 'Rolos', notes: 'Stack Rolos into a tree shape.' },
      { name: 'Cotton Ball Shovel', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'balls', defaultNumRounds: 1, supplies: 'Cotton balls, spoon, bowl', notes: 'Spoon in mouth, move cotton balls.' },
      { name: 'Ornament Swing', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'points', defaultNumRounds: 1, supplies: 'Ornament on string, cups', notes: 'Swing ornament into cup at waist.' },
      { name: 'Ring Toss', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'rings', defaultNumRounds: 2, supplies: 'Antler headband, rings', notes: 'Toss rings onto partner wearing antlers.' },
      { name: 'Costume Contest', scoreType: 'high_wins' as const, scoreSource: 'voting' as const, scoreUnit: 'vote points', defaultNumRounds: 1, supplies: '', notes: 'Teams vote 1st/2nd/3rd. Points: 1st=10, 2nd=7, 3rd=5.' },
      { name: 'Cup-Ornament Flip', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'Cups, ornaments, ping pong balls', notes: 'Flip ornament off cup, catch in cup. Fastest time.' },
      { name: 'Candy Cane Fishing', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'canes', defaultNumRounds: 2, supplies: 'Candy canes, waist string, cups', notes: 'Hook candy canes from cup to cup. Most in 30s.' },
      { name: 'Snow Shoveling', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'balls', defaultNumRounds: 2, supplies: 'Cotton balls, spatula, bowl', notes: '30s, cotton balls into bowl.' },
      { name: 'Marshmallow Straw', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'mallows', defaultNumRounds: 2, supplies: 'Mini marshmallows, straws, plates', notes: 'Suck mallows from plate to plate in 30s.' },
      { name: 'Ping Pong Kleenex Box', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'balls', defaultNumRounds: 2, supplies: 'Kleenex box, ping pong balls, belt', notes: 'Shake balls out of box tied to back. 30s.' },
      { name: 'Cup Pyramid (balance ball)', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 2, supplies: '10 cups, ball', notes: 'Stack cups with ball on top. Fastest time.' },
      { name: 'Blowing Snowballs', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'Cotton balls, cups, noise maker', notes: 'Blow cotton balls off cups. Fastest time.' },
      { name: 'Stack the Sack', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'Cups, balloon', notes: 'Use balloon to stack cups. Fastest time.' },
      { name: 'Candy Cane Zipline', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 1, supplies: 'Candy canes, string, cups', notes: 'Drop candy canes into cups via string. Fastest time.' },
      { name: 'Ping Pong Hole in Lid', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'balls', defaultNumRounds: 1, supplies: 'Ping pong balls, cups with lids', notes: '' },
      { name: 'Hungry Hippos Reindeer Prance', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'points', defaultNumRounds: 1, supplies: '', notes: '' },
      { name: "Santa's Scooper", scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'points', defaultNumRounds: 1, supplies: '', notes: '' },
      { name: 'Candy Cane Scooping', scoreType: 'high_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'canes', defaultNumRounds: 1, supplies: 'Candy canes, bowl', notes: '' },
      { name: 'Cup Stacking Contest', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 1, supplies: 'Cups', notes: '' },
      { name: 'Chimney Drop', scoreType: 'low_wins' as const, scoreSource: 'manual' as const, scoreUnit: 'seconds', defaultNumRounds: 1, supplies: '', notes: '' },
    ];

    await db.insert(gameLibrary).values(
      libraryGames.map((g) => ({
        ...g,
        scoringDescription: '',
        instructions: '',
      })),
    );
    console.log(`  ✓ ${libraryGames.length} game library entries`);
  } else {
    console.log('  ↩ Game library already seeded, skipping');
  }

  // ── Test year ───────────────────────────────────────────────────────────────
  await db.update(years).set({ isActive: false }).where(eq(years.isActive, true));

  const existingYear = await db.select().from(years).where(eq(years.year, 9999)).limit(1);
  let yearId: string;

  if (existingYear.length === 0) {
    const [inserted] = await db
      .insert(years)
      .values({ year: 9999, isActive: true, isLocked: false, isTest: true })
      .returning({ id: years.id });
    yearId = inserted.id;
    console.log(`  ✓ Test year 9999 created (id: ${yearId})`);
  } else {
    yearId = existingYear[0].id;
    await db.update(years).set({ isActive: true }).where(eq(years.id, yearId));
    console.log(`  ↩ Test year 9999 already exists (id: ${yearId}), set as active`);
  }

  // ── Teams ───────────────────────────────────────────────────────────────────
  const sampleTeams = [
    { name: 'Murphys', displayColor: '#C41E3A' },
    { name: 'Joneses', displayColor: '#1A8B3A' },
    { name: 'Smiths', displayColor: '#D4AF37' },
    { name: 'Carvers', displayColor: '#4A90D9' },
  ];

  for (const t of sampleTeams) {
    await db
      .insert(teams)
      .values({ yearId, name: t.name, displayColor: t.displayColor })
      .onConflictDoNothing();
  }

  const teamRows = await db.select().from(teams).where(eq(teams.yearId, yearId));
  console.log(`  ✓ ${teamRows.length} teams`);

  // ── Games ───────────────────────────────────────────────────────────────────
  const existingGames = await db.select({ id: games.id }).from(games).where(eq(games.yearId, yearId));
  if (existingGames.length === 0) {
    await db.insert(games).values([
      {
        yearId,
        name: 'Ring Toss',
        instructions: 'Toss rings onto reindeer antlers worn by your partner. Each person goes once.',
        scoringDescription: 'Total rings caught per couple (sum of both rounds)',
        scoreType: 'high_wins',
        scoreSource: 'manual',
        scoreUnit: 'rings',
        numRounds: 2,
        roundCombineMethod: 'sum',
        sortOrder: 1,
      },
      {
        yearId,
        name: 'Candy Cane Zipline',
        instructions: 'Partners stand apart holding a string. Drop 6 candy canes into 6 cups. Fastest time wins.',
        scoringDescription: 'Time to drop all 6 candy canes (seconds — lower is better)',
        scoreType: 'low_wins',
        scoreSource: 'manual',
        scoreUnit: 'seconds',
        numRounds: 1,
        roundCombineMethod: 'sum',
        sortOrder: 2,
      },
      {
        yearId,
        name: 'Costume Contest',
        instructions: 'All teams vote for 1st, 2nd, and 3rd best costume.',
        scoringDescription: 'Vote points received: 1st=10pts, 2nd=7pts, 3rd=5pts',
        scoreType: 'high_wins',
        scoreSource: 'voting',
        scoreUnit: 'vote points',
        numRounds: 1,
        roundCombineMethod: 'sum',
        sortOrder: 3,
      },
    ]);
    console.log('  ✓ 3 sample games (Ring Toss, Candy Cane Zipline, Costume Contest)');
  } else {
    console.log(`  ↩ ${existingGames.length} games already exist for year 9999, skipping`);
  }

  console.log('\n🎄 Dev seed complete! Test year 9999 is ready.');
  console.log('   Next: npm run dev');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
