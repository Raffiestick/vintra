declare module 'pdf-parse' {
  // Minimal typing: enough for `const { text } = await pdfParse(buffer)`
  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer
  ): Promise<{ text: string }>;
}
