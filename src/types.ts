export interface Question {
  id: string;
  type?: "mc" | "blank"; // default is mc
  question: string;
  options: string[]; // for mc style; or empty for fill-in-the-blanks
  correctAnswerIndex: number; // for mc style
  correctAnswers?: string[]; // acceptable text answers for 'blank' style
  explanation: string;
}

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  selectedAnswerIndex: number | null;
  hasAnswered: boolean;
  isFinished: boolean;
  scoreTracker: boolean[]; // tracks correctness of each question
}
