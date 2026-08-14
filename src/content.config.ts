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
    type: z.enum(['poem', 'book', 'interview', 'misc']),
    work: z.string().optional(),
    year: z.union([z.string(), z.number()]).optional()
  })
});

export const collections = { anthology };
