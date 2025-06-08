import {Component, inject} from '@angular/core';
import {GameAreaComponent} from './game-area/game-area';
import {CommonModule} from '@angular/common'; // Add CommonModule
import {GameSettingsService} from './services/game-settings.service'; // Add
import {DifficultyMode} from './models/difficulty.model'; // Add
import {GameState} from './models/game-state.model'; // Add

@Component({
  selector: 'app-root',
  imports: [CommonModule, GameAreaComponent], // Add CommonModule
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  gameSettingsService = inject(GameSettingsService);
  title = 'lightsaber'; // Keep existing if present
  currentGameState = this.gameSettingsService.getGameState(); // Add
  GameState = GameState; // Expose GameState to template

  setDifficulty(difficultyName: string): void {
    let mode: DifficultyMode;
    switch (difficultyName) {
      case 'Jedi Padawan':
        mode = DifficultyMode.Padawan;
        break;
      case 'Jedi Knight':
        mode = DifficultyMode.Knight;
        break;
      case 'Jedi Master':
        mode = DifficultyMode.Master;
        break;
      default:
        mode = DifficultyMode.Padawan; // Default fallback
    }
    this.gameSettingsService.setDifficultyMode(mode);
    this.gameSettingsService.setGameState(GameState.Playing); // Add
    console.log(`Difficulty set to: ${mode}`);
  }

  isDifficulty(difficultyName: string): boolean {
    const currentMode = this.gameSettingsService.getDifficultyMode()();
    return currentMode === difficultyName;
  }
}
