import { z } from 'zod';
import {
  scoreTypeEnum,
  scoreSourceEnum,
  roundCombineMethodEnum,
  displayModeEnum,
  podiumStateEnum,
} from '@/db/schema';

/**
 * Request-body building blocks shared by the admin routes. Enum values are read
 * from the Drizzle enums so a new option is added in one place (db/schema.ts).
 * PATCH schemas are the create shape run through `.partial()`.
 */

export const uuid = z.string().uuid();

const scoreType = z.enum(scoreTypeEnum.enumValues);
const scoreSource = z.enum(scoreSourceEnum.enumValues);
const roundCombineMethod = z.enum(roundCombineMethodEnum.enumValues);
const gameName = z.string().trim().min(1).max(80);
const scoreUnit = z.string().trim().min(1).max(30);
const numRounds = z.number().int().min(1).max(2);

// ── Games (per-edition) and the shared library ──────────────────────────────
//
// Fields are declared once WITHOUT defaults. PATCH = those fields, all optional.
// CREATE = the same fields with defaults filled in. (Never derive PATCH from a
// schema that has `.default()`s: Zod would fill them in and a rename would wipe
// the game's instructions. lib/schemas.test.ts guards this.)

const gameFields = z.object({
  name: gameName,
  instructions: z.string(),
  scoringDescription: z.string(),
  scoreType,
  scoreSource,
  scoreUnit,
  numRounds,
  roundCombineMethod,
});
export const patchGameSchema = gameFields.partial();
export const createGameSchema = gameFields.extend({
  yearId: uuid,
  instructions: gameFields.shape.instructions.default(''),
  scoringDescription: gameFields.shape.scoringDescription.default(''),
  scoreUnit: gameFields.shape.scoreUnit.default('points'),
  numRounds: gameFields.shape.numRounds.default(1),
  roundCombineMethod: gameFields.shape.roundCombineMethod.default('sum'),
  libraryGameId: uuid.nullable().optional(),
});

const libraryFields = gameFields.omit({ numRounds: true, roundCombineMethod: true }).extend({
  defaultNumRounds: numRounds,
  supplies: z.string(),
  notes: z.string(),
});
export const patchLibraryGameSchema = libraryFields.partial();
export const createLibraryGameSchema = libraryFields.extend({
  instructions: libraryFields.shape.instructions.default(''),
  scoringDescription: libraryFields.shape.scoringDescription.default(''),
  scoreType: libraryFields.shape.scoreType.default('high_wins'),
  scoreSource: libraryFields.shape.scoreSource.default('manual'),
  scoreUnit: libraryFields.shape.scoreUnit.default('points'),
  defaultNumRounds: libraryFields.shape.defaultNumRounds.default(1),
  supplies: libraryFields.shape.supplies.default(''),
  notes: libraryFields.shape.notes.default(''),
});

// ── Teams ───────────────────────────────────────────────────────────────────

const teamName = z.string().trim().min(1).max(60);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #C41E3A');

export const createTeamSchema = z.object({
  yearId: uuid,
  name: teamName,
  displayColor: hexColor.default('#C41E3A'),
});
export const patchTeamSchema = z.object({ name: teamName, displayColor: hexColor }).partial();

// ── Editions ────────────────────────────────────────────────────────────────

export const patchYearSchema = z.object({
  isActive: z.boolean(),
  displayMode: z.enum(displayModeEnum.enumValues),
  podiumState: z.enum(podiumStateEnum.enumValues),
}).partial();
