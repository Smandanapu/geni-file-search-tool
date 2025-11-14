import { GoogleGenAI } from "@google/genai";
import type { Source } from "./types";

// Lazy initialization for the AI client
let ai: GoogleGenAI | null = null;

function getAi() {
  if (!ai) {
    const apiKey = import.meta.env.VITE_API_KEY;;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is not set.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Helper to convert a File object to a GoogleGenerativeAI.Part object.
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

export async function queryWithFiles(files: File[], query: string) {
  const ai = getAi();
  const model = 'gemini-2.5-flash';

  const fileParts = await Promise.all(
    files.map(fileToGenerativePart)
  );
  
  const contents = {
    parts: [
        ...fileParts,
        { text: query }
    ]
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
  });

  const text = response.text;
  
  // For this approach, we consider all provided files as potential sources.
  const sources: Source[] = files.map(f => ({ fileName: f.name }));
  
  return { text, sources };
}
