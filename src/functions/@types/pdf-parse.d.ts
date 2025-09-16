
declare module 'pdf-parse' {
  export default function pdfParse(
    dataBuffer: Buffer | Uint8Array | ArrayBuffer
  ): Promise<{ text: string }>;
}
