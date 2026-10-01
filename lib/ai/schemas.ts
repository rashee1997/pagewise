import { z } from 'zod';

export const CardItemSchema = z.object({
  type: z.enum(['basic', 'cloze', 'concept']),
  front: z.string().min(5).max(300),
  back: z.string().min(1).max(600),
  hint: z.string().max(150).optional(),
  conceptKey: z.string().regex(/^[a-z0-9-]{3,60}$/),
  sourcePage: z.number().int().optional(),
});

export const CardsSchema = z.object({
  cards: z.array(CardItemSchema).min(1).max(25),
});

export const SummarySchema = z.object({
  headline: z.string().min(5).max(200),
  overview: z.string().min(20),
  takeaways: z.array(z.string().min(5)).min(2).max(10),
  outline: z.array(
    z.object({
      title: z.string().min(2),
      summary: z.string().min(5),
    })
  ),
});

export const KeyIdeaItemSchema = z.object({
  title: z.string().min(3).max(150),
  explanation: z.string().min(10),
  quote: z.string().optional(),
  actionableInsight: z.string().optional(),
});

export const KeyIdeasSchema = z.array(KeyIdeaItemSchema).min(1).max(15);

export const QuizQuestionItemSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctAnswerIndex: z.number().int().min(0).max(5),
  explanation: z.string().min(5),
});

export const QuizSchema = z.array(QuizQuestionItemSchema).min(1).max(10);

export const GlossaryItemSchema = z.object({
  term: z.string().min(1).max(100),
  definition: z.string().min(5),
  contextUsage: z.string().optional(),
});

export const GlossarySchema = z.array(GlossaryItemSchema).min(1).max(25);
