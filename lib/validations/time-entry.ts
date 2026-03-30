import { z } from "zod";

export const entryTypes = ["clock_in", "clock_out", "break_start", "break_end", "pause_start", "pause_end"] as const;

export const timeEntrySchema = z.object({
  type: z.enum(entryTypes),
  occurredAt: z.coerce.date(),
  observation: z.string().max(500).optional(),
});

export const timeEntryQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  start: z.coerce.date(),
  end: z.coerce.date(),
});

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
export type TimeEntryQueryInput = z.infer<typeof timeEntryQuerySchema>;
