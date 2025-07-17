// Enhanced wrapper for pdf-parse to handle CommonJS/ESM compatibility issues
import * as fs from 'fs';

let pdfParse: any;

export async function parsePDF(dataBuffer: Buffer): Promise<{ text: string }> {
  if (!pdfParse) {
    // Enhanced lazy loading with multiple fallback strategies
    try {
      // Try ESM import first
      const module = await import('pdf-parse');
      pdfParse = module.default || module;
      console.log('PDF parser loaded via ESM import');
    } catch (esmError) {
      try {
        // Fallback to CommonJS require for compatibility
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        pdfParse = require('pdf-parse');
        console.log('PDF parser loaded via CommonJS require');
      } catch (cjsError) {
        console.error('All PDF parser loading strategies failed:', {
          esmError: esmError.message,
          cjsError: cjsError.message
        });
        throw new Error('PDF parsing unavailable - module loading failed');
      }
    }
  }
  
  try {
    const result = await pdfParse(dataBuffer);
    console.log(`PDF parsed successfully: ${result.text.length} characters extracted`);
    return result;
  } catch (parseError) {
    console.error('PDF parsing execution failed:', parseError.message);
    throw new Error(`PDF parsing failed: ${parseError.message}`);
  }
}