import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameAreaComponent } from './game-area/game-area';
import { CommonModule } from '@angular/common'; // Add CommonModule

import { GameSettingsService } from './services/game-settings.service'; // Add
import { DifficultyMode } from './models/difficulty.model'; // Add

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, GameAreaComponent], // Add CommonModule
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'lightsaber'; // Keep existing if present

  constructor(private gameSettingsService: GameSettingsService) {}

  setDifficulty(difficultyName: string): void {
    let mode: DifficultyMode;
    switch (difficultyName) {
      case 'Padawan':
        mode = DifficultyMode.Padawan;
        break;
      case 'Knight':
        mode = DifficultyMode.Knight;
        break;
      case 'Master':
        mode = DifficultyMode.Master;
        break;
      default:
        mode = DifficultyMode.Padawan; // Default fallback
    }
    this.gameSettingsService.setDifficultyMode(mode);
    console.log(`Difficulty set to: ${mode}`);
  }

  isDifficulty(difficultyName: string): boolean {
    const currentMode = this.gameSettingsService.getDifficultyMode()();
    return currentMode === difficultyName;
  }
}
