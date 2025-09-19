"use client";

'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
// import { generateMarketingContent, type GenerateMarketingContentInput } from '@/ai/flows/generate-marketing-content';
import { Loader2, Sparkles, Clipboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
    vehicleType: z.string().min(1, 'Vehicle type is required'),
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    year: z.preprocess(
        (a) => parseInt(z.string().parse(a), 10),
        z.number().min(1900, 'Invalid year').max(new Date().getFullYear() + 1, 'Invalid year')
    ),
    keyFeatures: z.string().min(10, 'List at least one key feature'),
    tone: z.enum(['Professional', 'Excited', 'Humorous', 'Luxurious']),
    platform: z.enum(['Facebook', 'Instagram', 'Craigslist', 'Website']),
});

type FormData = z.infer<typeof formSchema>;

export default function ContentGeneratorPage() {
    const { user, loading: authLoading } = useAuth();
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            tone: 'Professional',
            platform: 'Facebook',
        }
    });

    const onSubmit = async (data: FormData) => {
        setIsGenerating(true);
        setGeneratedContent('');
        toast({
            title: 'Content Generator Disabled',
            description: 'This feature is temporarily disabled while we resolve a build issue.',
            variant: 'destructive',
        });
        setIsGenerating(false);
        // try {
        //     const input: GenerateMarketingContentInput = {
        //         ...data,
        //         year: data.year.toString(),
        //     };
        //     const result = await generateMarketingContent(input);
        //     setGeneratedContent(result.marketingCopy);
        //     toast({ title: 'Content Generated!' });
        // } catch (error: any) {
        //     console.error('Error generating content:', error);
        //     toast({
        //         title: 'Generation Failed',
        //         description: error.message || 'An unexpected error occurred.',
        //         variant: 'destructive',
        //     });
        // } finally {
        //     setIsGenerating(false);
        // }
    };
    
    const copyToClipboard = () => {
        if (!generatedContent) return;
        navigator.clipboard.writeText(generatedContent);
        toast({ title: 'Copied to Clipboard!' });
    }

    if (authLoading) {
        return <p>Loading...</p>
    }

    if (!user) {
        return <p>Please sign in to use the content generator.</p>
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>AI Content Generator</CardTitle>
                    <CardDescription>Describe the vehicle and let AI write the marketing copy for you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="vehicleType">Vehicle Type</Label>
                                <Input id="vehicleType" {...register('vehicleType')} placeholder="e.g., SUV, Sedan, Motorcycle" />
                                {errors.vehicleType && <p className="text-destructive text-sm mt-1">{errors.vehicleType.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="year">Year</Label>
                                <Input id="year" type="number" {...register('year')} placeholder="e.g., 2023" />
                                {errors.year && <p className="text-destructive text-sm mt-1">{errors.year.message}</p>}
                            </div>
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="make">Make</Label>
                                <Input id="make" {...register('make')} placeholder="e.g., Toyota" />
                                {errors.make && <p className="text-destructive text-sm mt-1">{errors.make.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="model">Model</Label>
                                <Input id="model" {...register('model')} placeholder="e.g., Camry" />
                                {errors.model && <p className="text-destructive text-sm mt-1">{errors.model.message}</p>}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="keyFeatures">Key Features</Label>
                            <Textarea id="keyFeatures" {...register('keyFeatures')} placeholder="e.g., low mileage, new tires, sunroof, leather seats" />
                            {errors.keyFeatures && <p className="text-destructive text-sm mt-1">{errors.keyFeatures.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="tone"
                                control={control}
                                render={({ field }) => (
                                    <div>
                                        <Label>Tone</Label>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue placeholder="Select a tone" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Professional">Professional</SelectItem>
                                                <SelectItem value="Excited">Excited</SelectItem>
                                                <SelectItem value="Humorous">Humorous</SelectItem>
                                                <SelectItem value="Luxurious">Luxurious</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            />
                             <Controller
                                name="platform"
                                control={control}
                                render={({ field }) => (
                                    <div>
                                        <Label>Platform</Label>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue placeholder="Select a platform" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Facebook">Facebook</SelectItem>
                                                <SelectItem value="Instagram">Instagram</SelectItem>
                                                <SelectItem value="Craigslist">Craigslist</SelectItem>
                                                <SelectItem value="Website">Website Blurb</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            />
                        </div>
                        
                        <Button type="submit" disabled={isGenerating} className="w-full">
                            {isGenerating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Generate Content
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Generated Copy</CardTitle>
                            <CardDescription>Your AI-crafted marketing content will appear here.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!generatedContent}>
                            <Clipboard className="mr-2" />
                            Copy
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isGenerating && (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {generatedContent && (
                        <div className="prose dark:prose-invert prose-sm bg-muted rounded-md p-4 whitespace-pre-wrap h-full min-h-[300px]">
                            {generatedContent}
                        </div>
                    )}
                     {!isGenerating && !generatedContent && (
                        <div className="flex items-center justify-center text-center h-48 border-2 border-dashed rounded-md">
                            <p className="text-muted-foreground">Fill out the form to generate content</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
