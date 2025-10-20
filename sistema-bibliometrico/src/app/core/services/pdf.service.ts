import { Injectable } from '@angular/core';
// 1. Importar desde la ruta principal
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, TextContent } from 'pdfjs-dist/types/src/display/api';
// 2. Importar el worker directamente
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

interface PdfInfo {
  Title?: string;
  Author?: string;
  CreationDate?: string;
  ModDate?: string;
  [key: string]: any;
}

export interface PdfMetadata {
  title: string;
  author: string;
  year?: number;
}

// Derivamos el tipo del item directamente de la interfaz TextContent
type TextItem = TextContent['items'][number];

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() {
    // 3. Configurar el worker usando la importación
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  }

  /**
   * Extrae el texto completo del PDF
   */
  async extractTextFromFile(file: File): Promise<string> {
    const loadingTask = pdfjsLib.getDocument(await file.arrayBuffer());
    try {
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items
          .filter((item): item is TextItem & { str: string } => 'str' in item)
          .map((item) => item.str)
          .join(' ');
        fullText += '\n';
      }

      return fullText;
    } catch (error) {
      console.error('Error al procesar el PDF:', error);
      throw new Error('No se pudo leer el archivo PDF. Puede que esté dañado o protegido.');
    }
  }

  /**
   * Extrae metadatos y determina el año automáticamente
   */
  async getMetadata(file: File): Promise<PdfMetadata> {
    try {
      const loadingTask = pdfjsLib.getDocument(await file.arrayBuffer());
      const pdf = await loadingTask.promise;
      const metadata = await pdf.getMetadata();
      const info: PdfInfo = metadata.info || {};

      let year: number | undefined;

      // 1️⃣ Intentar desde CreationDate o ModDate
      const dateString = info.CreationDate || info.ModDate;
      if (dateString) {
        const match = dateString.match(/\d{4}/);
        if (match) year = Number(match[0]);
      }

      // 2️⃣ Si no hay año, intentar buscar en el texto de la PRIMERA página
      if (!year && pdf.numPages > 0) {
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .filter((item): item is TextItem & { str: string } => 'str' in item)
          .map((item) => item.str)
          .join(' ');
        const match = text.match(/(19[89]\d|20\d{2})/g); // Busca años desde 1980 en adelante
        // Tomamos el año más reciente encontrado, que suele ser el de publicación
        if (match) year = Math.max(...match.map(Number));
      }

      // 3️⃣ Fallback: año actual
      if (!year) {
        year = new Date().getFullYear();
      }

      return {
        title: info.Title || '',
        author: info.Author || '',
        year
      };
    } catch (error) {
      console.error('Error al procesar los metadatos del PDF:', error);
      throw new Error('No se pudo leer los metadatos del PDF. El archivo puede estar dañado o en un formato no esperado.');
    }
  }
}
