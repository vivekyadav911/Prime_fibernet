import { z } from 'zod';

/** ISO-8601 timestamp string from Postgres `timestamptz`. */
export const timestamptzSchema = z.string().min(1);

/** ISO date string (`YYYY-MM-DD`) from Postgres `date`. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}/);

/** UUID primary key. */
export const uuidSchema = z.string().uuid();

/**
 * Officer/user id may be UUID or email (legacy officers email-as-PK).
 */
export const entityIdSchema = z.string().min(1);

export const parseTimestamptz = (value: unknown): string => timestamptzSchema.parse(value);

export const parseDate = (value: unknown): string => dateSchema.parse(value);
