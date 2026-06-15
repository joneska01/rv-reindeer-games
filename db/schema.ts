import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  boolean,
  text,
  timestamp,
  numeric,
  unique,
  index,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const displayModeEnum = pgEnum('display_mode', [
  'scoreboard',
  'podium',
  'final_results',
]);

export const podiumStateEnum = pgEnum('podium_state', [
  'hidden',
  'show_third',
  'show_second',
  'show_first',
  'show_all',
]);

export const scoreTypeEnum = pgEnum('score_type', ['high_wins', 'low_wins']);

export const scoreSourceEnum = pgEnum('score_source', ['manual', 'voting']);

export const roundCombineMethodEnum = pgEnum('round_combine_method', [
  'sum',
  'average',
]);

// ── Tables ─────────────────────────────────────────────────────────────────

export const years = pgTable('years', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  isActive: boolean('is_active').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  isTest: boolean('is_test').notNull().default(false),
  // True once any game has been set active — flips the TV from the welcome
  // screen to the live board, and never reverts (until a rehearsal reset).
  hasStarted: boolean('has_started').notNull().default(false),
  activeGameId: uuid('active_game_id'), // FK to games — set after games table exists
  displayMode: displayModeEnum('display_mode').notNull().default('scoreboard'),
  podiumState: podiumStateEnum('podium_state').notNull().default('hidden'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => years.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    displayColor: text('display_color').notNull().default('#C41E3A'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('teams_year_name_unique').on(t.yearId, t.name)],
);

export const gameLibrary = pgTable('game_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull().default(''),
  scoringDescription: text('scoring_description').notNull().default(''),
  scoreType: scoreTypeEnum('score_type').notNull().default('high_wins'),
  scoreSource: scoreSourceEnum('score_source').notNull().default('manual'),
  scoreUnit: text('score_unit').notNull().default('points'),
  defaultNumRounds: integer('default_num_rounds').notNull().default(1),
  supplies: text('supplies').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => years.id, { onDelete: 'cascade' }),
    libraryGameId: uuid('library_game_id').references(() => gameLibrary.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    instructions: text('instructions').notNull().default(''),
    scoringDescription: text('scoring_description').notNull().default(''),
    scoreType: scoreTypeEnum('score_type').notNull().default('high_wins'),
    scoreSource: scoreSourceEnum('score_source').notNull().default('manual'),
    scoreUnit: text('score_unit').notNull().default('points'),
    numRounds: integer('num_rounds').notNull().default(1),
    roundCombineMethod: roundCombineMethodEnum('round_combine_method')
      .notNull()
      .default('sum'),
    sortOrder: integer('sort_order').notNull().default(0),
    isComplete: boolean('is_complete').notNull().default(false),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('games_year_sort_idx').on(t.yearId, t.sortOrder)],
);

export const scores = pgTable(
  'scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    round: integer('round').notNull().default(1),
    rawScore: numeric('raw_score', { precision: 10, scale: 4 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('scores_game_team_round_unique').on(t.gameId, t.teamId, t.round)],
);

export const partyFouls = pgTable(
  'party_fouls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    yearId: uuid('year_id')
      .notNull()
      .references(() => years.id, { onDelete: 'cascade' }),
    description: text('description'),
    assessedAt: timestamp('assessed_at').notNull().defaultNow(),
  },
  (t) => [index('party_fouls_team_year_idx').on(t.teamId, t.yearId)],
);

export const costumeVotes = pgTable(
  'costume_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => years.id, { onDelete: 'cascade' }),
    votingTeamId: uuid('voting_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    firstPlaceTeamId: uuid('first_place_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    secondPlaceTeamId: uuid('second_place_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    thirdPlaceTeamId: uuid('third_place_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('costume_votes_year_team_unique').on(t.yearId, t.votingTeamId),
  ],
);

// ── Types ──────────────────────────────────────────────────────────────────

export type Year = typeof years.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type PartyFoul = typeof partyFouls.$inferSelect;
export type CostumeVote = typeof costumeVotes.$inferSelect;
export type GameLibrary = typeof gameLibrary.$inferSelect;

export type NewYear = typeof years.$inferInsert;
export type NewTeam = typeof teams.$inferInsert;
export type NewGame = typeof games.$inferInsert;
export type NewScore = typeof scores.$inferInsert;
export type NewPartyFoul = typeof partyFouls.$inferInsert;
export type NewCostumeVote = typeof costumeVotes.$inferInsert;
export type NewGameLibrary = typeof gameLibrary.$inferInsert;
