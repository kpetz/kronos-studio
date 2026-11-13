import { z } from "zod";

export const CharacterSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    role: z.string(),
    look: z.string(),
    voice: z.string(),
    catchphrase: z.string(),
    /** False for characters that only make sounds (La Impresora, El Hacker). */
    speaks: z.boolean(),
    /** False for the narrator, who is never on screen. */
    appears: z.boolean(),
  })
  .strict();

export const SoundSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    when: z.string(),
    /** "sheet" = imported from the workbook, "bible" = listed only in docs/SERIES_BIBLE.md. */
    origin: z.enum(["sheet", "bible"]),
  })
  .strict();

export const ChecklistItemSchema = z
  .object({ stage: z.string().min(1), check: z.string().min(1) })
  .strict();

export const StructureBeatSchema = z
  .object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    time: z.string(),
    what: z.string(),
    why: z.string(),
  })
  .strict();

export const CharactersFileSchema = z.array(CharacterSchema).min(1);
export const SoundsFileSchema = z.array(SoundSchema).min(1);
export const ChecklistFileSchema = z.array(ChecklistItemSchema);
export const StructureFileSchema = z.array(StructureBeatSchema);

export type Character = z.infer<typeof CharacterSchema>;
export type Sound = z.infer<typeof SoundSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type StructureBeat = z.infer<typeof StructureBeatSchema>;
