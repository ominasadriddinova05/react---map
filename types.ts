
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  thinkingBudget?: number;
}
