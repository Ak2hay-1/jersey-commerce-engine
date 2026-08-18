import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 180;

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN, 'Slug must be a lowercase URL-safe value such as india-cricket-jersey.');
