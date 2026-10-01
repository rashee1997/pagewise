export interface CitationItem {
  index: number;
  quote: string;
  approximateParagraph?: number;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  citations?: CitationItem[];
  generatedCard?: {
    front: string;
    back: string;
    conceptKey: string;
  };
  generatedQuiz?: {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  };
  cardAdded?: boolean;
}
