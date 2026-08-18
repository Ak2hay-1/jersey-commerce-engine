import { publicEnvSchema } from '@jersey-commerce/config';

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
