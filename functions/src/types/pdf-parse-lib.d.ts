declare module 'pdf-parse/lib/pdf-parse.js' {
  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer
  ): Promise<{ text: string }>;
}
