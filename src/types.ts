export interface Player {
  id: string;
  name: string;
  roomCode: string;
  answer?: string;
}

export interface Room {
  code: string;
  players: Player[];
  currentQuestion: number;
  score: number;
  round: number;
  isGameStarted: boolean;
}

export interface GameState {
  currentQuestion: string;
  timeRemaining: number;
  round: number;
  score: number;
  playerAnswers: Record<string, string>;
  isRevealed: boolean;
}