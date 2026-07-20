import { z } from 'zod';

const userDataSchema = z.object({
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  fbp: z.string().optional().nullable(),
  fbc: z.string().optional().nullable(),
  ttclid: z.string().optional().nullable(),
  ttp: z.string().optional().nullable(),
});

const customDataSchema = z.record(z.unknown()).optional();

export const trackEventBodySchema = z.object({
  eventName: z.string().min(1).max(100),
  url: z.string().url().optional(),
  eventId: z.string().uuid().optional(),
  userData: userDataSchema.optional().nullable(),
  customData: customDataSchema,
  tiktokProperties: customDataSchema,
});

export type TrackEventBody = z.infer<typeof trackEventBodySchema>;
