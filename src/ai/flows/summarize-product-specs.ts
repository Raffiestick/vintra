'use server';

/**
 * @fileOverview Summarizes product specifications to extract key features.
 *
 * - summarizeProductSpecs - A function that summarizes product specifications.
 * - SummarizeProductSpecsInput - The input type for the summarizeProductSpecs function.
 * - SummarizeProductSpecsOutput - The return type for the summarizeProductSpecs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProductSpecsInputSchema = z.object({
  productSpecs: z
    .string()
    .describe('The detailed specifications of a product.'),
});
export type SummarizeProductSpecsInput = z.infer<
  typeof SummarizeProductSpecsInputSchema
>;

const SummarizeProductSpecsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the key features of the product.'),
});
export type SummarizeProductSpecsOutput = z.infer<
  typeof SummarizeProductSpecsOutputSchema
>;

export async function summarizeProductSpecs(
  input: SummarizeProductSpecsInput
): Promise<SummarizeProductSpecsOutput> {
  return summarizeProductSpecsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProductSpecsPrompt',
  input: {schema: SummarizeProductSpecsInputSchema},
  output: {schema: SummarizeProductSpecsOutputSchema},
  prompt: `You are an expert in product marketing. Your goal is to summarize the key features of a product from its specifications.

  Specifications: {{{productSpecs}}}

  Provide a concise summary highlighting the most important selling points for dealers. Focus on what makes the product attractive to customers.`,
});

const summarizeProductSpecsFlow = ai.defineFlow(
  {
    name: 'summarizeProductSpecsFlow',
    inputSchema: SummarizeProductSpecsInputSchema,
    outputSchema: SummarizeProductSpecsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
