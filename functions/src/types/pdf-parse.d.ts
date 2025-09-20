declare module 'pdf-parse' {
  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer
  ): Promise<{ text: string }>;
}
