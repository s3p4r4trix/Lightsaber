import {Injectable, signal} from '@angular/core';
import {DifficultyMode} from '../models/difficulty.model';
import {GameState} from '../models/game-state.model';

@Injectable({
  providedIn: 'root'
})
export class GameSettingsService {
  private difficultyMode = signal<DifficultyMode>(DifficultyMode.Padawan);
  private gameState = signal<GameState>(GameState.DifficultySelection);

  constructor() { }

  setDifficultyMode(mode: DifficultyMode): void {
    this.difficultyMode.set(mode);
  }

  getDifficultyMode() {
    return this.difficultyMode.asReadonly();
  }

  setGameState(newState: GameState): void {
    this.gameState.set(newState);
  }

  getGameState() {
    return this.gameState.asReadonly();
  }
}
