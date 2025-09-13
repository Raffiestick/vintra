
'use server';
/**
 * @fileOverview Generates marketing content for vehicles.
 * 
 * - generateMarketingContent - A function to generate marketing copy.
 * - GenerateMarketingContentInput - The Zod schema for the input.
 * - GenerateMarketingContentOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GenerateMarketingContentInputSchema = z.object({
  vehicleType: z.string().describe('The type of vehicle (e.g., SUV, Sedan, Motorcycle).'),
  make: z.string().describe('The manufacturer of the vehicle (e.g., Toyota).'),
  model: z.string().describe('The model of the vehicle (e.g., Camry).'),
  year: z.string().describe('The manufacturing year of the vehicle.'),
  keyFeatures: z.string().describe('A comma-separated list of key features or selling points (e.g., low mileage, new tires, sunroof).'),
  tone: z.enum(['Professional', 'Excited', 'Humorous', 'Luxurious']).describe('The desired tone for the marketing copy.'),
  platform: z.enum(['Facebook', 'Instagram', 'Craigslist', 'Website']).describe('The target platform for the content (influences length and style).'),
});
export type GenerateMarketingContentInput = z.infer<typeof GenerateMarketingContentInputSchema>;

export const GenerateMarketingContentOutputSchema = z.object({
  marketingCopy: z.string().describe('The generated marketing copy, including relevant hashtags if applicable for the platform.'),
});
export type GenerateMarketingContentOutput = z.infer<typeof GenerateMarketingContentOutputSchema>;

const generateMarketingContentPrompt = ai.definePrompt({
  name: 'generateMarketingContentPrompt',
  input: { schema: GenerateMarketingContentInputSchema },
  output: { schema: GenerateMarketingContentOutputSchema },
  prompt: `
    You are an expert automotive copywriter for a used vehicle dealership.
    Your task is to generate compelling marketing copy for a specific vehicle based on the details provided.

    Vehicle Details:
    - Type: {{{vehicleType}}}
    - Year: {{{year}}}
    - Make: {{{make}}}
    - Model: {{{model}}}
    - Key Features: {{{keyFeatures}}}

    Instructions:
    1.  Write a captivating description for the vehicle.
    2.  The tone of the copy must be: {{{tone}}}.
    3.  Tailor the content for the following platform: {{{platform}}}.
        - For Instagram/Facebook, include relevant and popular hashtags (e.g., #usedcars, #cardeals, #toyotacamry).
        - For Craigslist, focus on a clear, informative, and slightly longer format.
        - For a Website blurb, keep it concise and professional.
    4.  Highlight the key features provided.
    5.  Do not invent features that are not listed.
    6.  Ensure the output is only the marketing copy text.
  `,
});

const generateMarketingContentFlow = ai.defineFlow(
  {
    name: 'generateMarketingContentFlow',
    inputSchema: GenerateMarketingContentInputSchema,
    outputSchema: GenerateMarketingContentOutputSchema,
  },
  async (input) => {
    const { output } = await generateMarketingContentPrompt(input);
    if (!output) {
      throw new Error('Failed to generate marketing content.');
    }
    return output;
  }
);

export async function generateMarketingContent(input: GenerateMarketingContentInput): Promise<GenerateMarketingContentOutput> {
  return generateMarketingContentFlow(input);
}
