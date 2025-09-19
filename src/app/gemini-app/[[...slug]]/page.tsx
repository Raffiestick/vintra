// This file acts as a server-side proxy to serve your mini-app.
import { promises as fs } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export default async function GeminiAppPage({ params }: { params: { slug: string[] } }) {
  // Determine the file to serve. If no path, serve index.html.
  const filePath = params.slug?.join('/') || 'index.html';
  
  // Security: Prevent directory traversal attacks
  if (filePath.includes('..')) {
    notFound();
  }

  const fullPath = path.join(process.cwd(), 'public/gemini-app', filePath);
  
  try {
    // Read the file content
    const fileContent = await fs.readFile(fullPath, 'utf-8');

    // Determine the content type based on file extension
    let contentType = 'text/html; charset=utf-8';
    if (filePath.endsWith('.css')) {
      contentType = 'text/css; charset=utf-8';
    } else if (filePath.endsWith('.js')) {
      contentType = 'application/javascript; charset=utf-8';
    }

    // Return a Response object with the file content and correct content type
    return new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    // If the file doesn't exist, show a 404 page.
    console.error(`Could not find file: ${fullPath}`, error);
    notFound();
  }
}
