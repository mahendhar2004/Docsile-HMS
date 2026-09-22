/**
 * Zod schemas for the auth module.
 * Derived from openapi.yaml component schemas and the auth endpoint request/response shapes.
 */

import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseDataSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.string(),
  hospitalId: z.string(),
});

export type LoginResponseData = z.infer<typeof LoginResponseDataSchema>;

// Refresh and Logout have no request body — they read from cookies only.
