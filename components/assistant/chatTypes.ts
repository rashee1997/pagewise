export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
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
