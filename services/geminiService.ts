
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateSimpleResponse(prompt: string, config?: GenerationConfig): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: config?.temperature ?? 0.7,
          topP: config?.topP ?? 0.95,
          topK: config?.topK ?? 40,
          thinkingConfig: { 
            thinkingBudget: config?.thinkingBudget ?? 0 
          }
        },
      });

      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to communicate with Gemini API");
    }
  }

  async generateChatResponse(history: { role: 'user' | 'model', parts: { text: string }[] }[], nextMessage: string) {
    try {
      const chat = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
      });

      // Simple implementation for demo
      const response = await chat.sendMessage({ message: nextMessage });
      return response.text || "";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
