import { z } from 'zod';

export const idSchema = z.string().min(1).max(128);
export const optionalIdSchema = idSchema.optional();
