import type { Language } from '../../contexts/LanguageContext';

export type QuizCategory = 'rules' | 'terms' | 'players' | 'history' | 'general';
export type QuizDifficulty = 1 | 2 | 3 | 4;

export type LocalizedText = Record<Language, string>;

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  correctIndex: number;
  question: LocalizedText;
  options: [LocalizedText, LocalizedText, LocalizedText, LocalizedText] | [string, string, string, string];
}

export interface LocalizedQuizQuestion {
  id: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  correctIndex: number;
  question: string;
  options: [string, string, string, string];
}

export const QUIZ_TOTAL_LEVELS = 15;

export const PRIZE_LADDER: number[] = [
  100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000,
];

export const SAFE_LEVELS = new Set([5, 10]);

/** Difficulty per question level: Q1-5 easy, Q6-10 medium, Q11-12 hard, Q13-15 elite */
export const DIFFICULTY_BY_LEVEL: QuizDifficulty[] = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 4, 4, 4];
