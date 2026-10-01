export const PRESETS = [
  { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', defaultModel: 'google/gemini-2.0-flash-001', fallbackModel: 'meta-llama/llama-3.3-70b-instruct' },
  { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', fallbackModel: 'gpt-3.5-turbo' },
  { name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', fallbackModel: 'llama-3.1-8b-instant' },
  { name: 'Ollama (Local)', baseURL: 'http://localhost:11434/v1', defaultModel: 'llama3.2', fallbackModel: 'mistral' },
  { name: 'LM Studio (Local)', baseURL: 'http://localhost:1234/v1', defaultModel: 'local-model', fallbackModel: '' },
];

export const DEFAULT_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.1-pro-preview',
];
