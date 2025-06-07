import { Injectable, signal } from '@angular/core';
import { DifficultyMode } from '../models/difficulty.model';

@Injectable({
  providedIn: 'root'
})
export class GameSettingsService {
  private difficultyMode = signal<DifficultyMode>(DifficultyMode.Padawan);

  constructor() { }

  setDifficultyMode(mode: DifficultyMode): void {
    this.difficultyMode.set(mode);
  }

  getDifficultyMode() {
    return this.difficultyMode.asReadonly();
  }
}
