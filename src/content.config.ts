import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const anthology = defineCollection({
  loader: glob({
    base: './content/anthology',
    pattern: '[!_]*.md'
  }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()).min(1),
    date: z.coerce.date().optional(),
    work: z.string().optional(),
    year: z.union([z.string(), z.number()]).optional()
  })
});

const notes = defineCollection({
  loader: glob({
    base: './content/notes',
    pattern: '[!_]*.md'
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    email: z.string().email().optional()
  })
});

const recetas = defineCollection({
  loader: glob({
    base: './content/recetas',
    pattern: '[!_]*.md'
  }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()).min(1),
    book: z.enum(['dulces', 'salados', 'adicionales']),
    pages: z.array(z.number().int().positive()).min(1),
    ingredients: z
      .union([
        z.array(z.string()),
        z.array(z.object({ group: z.string(), items: z.array(z.string()) }))
      ])
      .default([]),
    review: z.string().optional()
  })
});

export const collections = { anthology, notes, recetas };
