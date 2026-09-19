import { z } from 'zod';
import { THEME_PREFERENCES, UNIT_SYSTEMS } from '../constants/enums';
import { COFFEE_PREFERENCES, MAX_COFFEE_PREFERENCES } from '../constants/preferences';
import { emailSchema, nameSchema } from './auth';

/**
 * Profile and settings contracts.
 *
 * Note what is absent: `role`, `_id` and anything token-related. Those are never
 * accepted from a request body, so no amount of client creativity can promote an
 * account to admin or write to someone else's profile.
 */

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'Nothing to update',
  });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const coffeePreferencesSchema = z.object({
  preferences: z
    .array(z.enum(COFFEE_PREFERENCES))
    .max(MAX_COFFEE_PREFERENCES)
    // The client can send duplicates; storing them would skew personalisation.
    .transform((values) => Array.from(new Set(values))),
});
export type CoffeePreferencesInput = z.infer<typeof coffeePreferencesSchema>;

export const notificationSettingsSchema = z.object({
  productUpdates: z.boolean(),
  brewReminders: z.boolean(),
  newRecipes: z.boolean(),
});

export const userSettingsSchema = z.object({
  theme: z.enum(THEME_PREFERENCES).optional(),
  unitSystem: z.enum(UNIT_SYSTEMS).optional(),
  reducedMotion: z.boolean().nullable().optional(),
  notifications: notificationSettingsSchema.partial().optional(),
});
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;

export const completeOnboardingSchema = z.object({
  preferences: z.array(z.enum(COFFEE_PREFERENCES)).max(MAX_COFFEE_PREFERENCES).default([]),
});
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

/**
 * Account deletion requires the user to type their own email. A single "are you
 * sure?" button is too easy to hit by accident for an irreversible, cascading action.
 */
export const deleteAccountSchema = z.object({
  confirmation: z.string().min(1, 'Type your email address to confirm'),
  password: z.string().min(1, 'Enter your password'),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
