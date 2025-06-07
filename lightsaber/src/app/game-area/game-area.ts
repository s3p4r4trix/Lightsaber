import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ViewChildren, QueryList, AfterViewInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LightsaberComponent } from '../lightsaber/lightsaber';
import { BlasterShotComponent } from '../blaster-shot/blaster-shot';
import { GameSettingsService } from '../services/game-settings.service';
import { DifficultyMode } from '../models/difficulty.model';

interface BlasterShot {
  id: string;
  x: number;
  y: number;
  currentY: number; // Used for animation directly in template
  componentRef?: BlasterShotComponent; // Keep a reference if needed, though not strictly for this approach
}

@Component({
  selector: 'app-game-area',
  standalone: true,
  imports: [CommonModule, LightsaberComponent, BlasterShotComponent],
  templateUrl: './game-area.html',
  styleUrls: ['./game-area.scss']
})
export class GameAreaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameAreaContainer') gameAreaContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(LightsaberComponent) lightsaberComponent!: LightsaberComponent;
  @ViewChildren(BlasterShotComponent) blasterShotComponents!: QueryList<BlasterShotComponent>;

  activeShots = signal<BlasterShot[]>([]);
  score = signal<number>(0);
  private gameLoopInterval: any;
  private shotSpawnInterval: any;
  private gameAreaWidth: number = 0;
  private gameAreaHeight: number = 0;

  shotSpeed: number = 5; // Pixels per frame
  readonly shotSpawnRate: number = 1500; // Milliseconds

  constructor(private gameSettingsService: GameSettingsService) {
    // Effect to react to difficulty changes
    effect(() => {
      const currentDifficulty = this.gameSettingsService.getDifficultyMode()();
      console.log('Difficulty changed to:', currentDifficulty, '. Restarting game.');
      this.updateShotSpeed(currentDifficulty); // Update speed first

      // Ensure game area dimensions are known before restarting
      if (this.gameAreaWidth > 0 && this.gameAreaHeight > 0) {
        this.resetGame();
        this.startGame();
      } else {
        // This case might happen if difficulty changes before ngAfterViewInit has set dimensions.
        // ngAfterViewInit will call updateShotSpeed and startGame anyway.
        console.log('Game dimensions not yet set, startGame will be called by ngAfterViewInit.');
      }
    });
  }

  ngOnInit(): void {
    // Game loop will be started in ngAfterViewInit to ensure view children are available
  }

  ngAfterViewInit(): void {
    if (!this.gameAreaContainer || !this.gameAreaContainer.nativeElement) {
      console.error("Game area container not found!");
      return;
    }
    this.gameAreaWidth = this.gameAreaContainer.nativeElement.offsetWidth;
    this.gameAreaHeight = this.gameAreaContainer.nativeElement.offsetHeight;

    // Initialize shot speed based on current difficulty setting
    this.updateShotSpeed(this.gameSettingsService.getDifficultyMode()());

    if (this.lightsaberComponent && this.lightsaberComponent.el && this.lightsaberComponent.el.nativeElement) {
      // Pass game area reference to lightsaber if needed, or ensure lightsaber can find it.
      // The lightsaber currently tries to find '.game-area-container' itself.
    } else {
      console.error("Lightsaber component not found after view init!");
    }

    this.startGame();
  }

  updateShotSpeed(difficulty: DifficultyMode): void {
    switch (difficulty) {
      case DifficultyMode.Knight:
        this.shotSpeed = 10; // Base speed (5) * 2
        break;
      case DifficultyMode.Master:
        this.shotSpeed = 20; // Base speed (5) * 4
        break;
      case DifficultyMode.Padawan:
      default:
        this.shotSpeed = 5; // Base speed
        break;
    }
    console.log(`Shot speed updated to: ${this.shotSpeed} for difficulty: ${difficulty}`);
  }

  resetGame(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    if (this.shotSpawnInterval) {
      clearInterval(this.shotSpawnInterval);
    }
    this.activeShots.set([]); // Clear any existing shots
    this.score.set(0); // Reset score
    console.log('Game has been reset.');
  }

  startGame(): void {
    this.activeShots.set([]);
    this.score.set(0);

    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, 16); // Roughly 60 FPS

    this.shotSpawnInterval = setInterval(() => {
      this.spawnBlasterShot();
    }, this.shotSpawnRate);
  }

  spawnBlasterShot(): void {
    if (!this.gameAreaWidth) return; // Ensure gameAreaWidth is initialized

    const shotWidth = 8; // Approximate width of blaster-shot, should match CSS if possible
    const randomX = Math.random() * (this.gameAreaWidth - shotWidth);
    const newShot: BlasterShot = {
      id: `shot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      x: randomX,
      y: 0, // Start at the top
      currentY: 0,
    };
    this.activeShots.update(shots => [...shots, newShot]);
  }

  updateGame(): void {
    if (!this.lightsaberComponent || !this.lightsaberComponent.el || !this.gameAreaContainer) {
      return;
    }

    const lightsaberRect = this.lightsaberComponent.el.nativeElement.getBoundingClientRect();
    const gameAreaRect = this.gameAreaContainer.nativeElement.getBoundingClientRect();


    // Move shots and check for collisions
    this.activeShots.update(shots => shots.filter(shot => {
      shot.currentY += this.shotSpeed;

      // Remove shot if it goes off screen (bottom)
      if (shot.currentY > this.gameAreaHeight) {
        return false; // Remove from activeShots
      }

      // Collision detection
      // We need the actual rendered positions of blaster shots.
      // Using their 'id' to find the corresponding DOM element or component instance.
      const shotComponentInstance = this.blasterShotComponents.find(c => c.id() === shot.id);

      if (shotComponentInstance && shotComponentInstance.el && shotComponentInstance.el.nativeElement) {
        const shotRect = shotComponentInstance.el.nativeElement.getBoundingClientRect();

        // Adjust for game area offset if lightsaberRect is relative to viewport and shotRect is too.
        // The lightsaber position is already relative to the game area if its mousemove is constrained.
        // The shot's X is its initial X, its Y is animated via transform.

        // A simple bounding box collision detection:
        // Lightsaber X is its center, so calculate its left/right bounds.
        const lightsaberWidth = lightsaberRect.width;
        const lightsaberLeft = lightsaberRect.left - gameAreaRect.left; // position relative to game area
        const lightsaberRight = lightsaberLeft + lightsaberWidth;
        const lightsaberTop = lightsaberRect.top - gameAreaRect.top; // Y position of the lightsaber top

        // Shot's position (relative to game area)
        const currentShotX = shot.x; // This is the 'left' style value
        const currentShotY = shot.currentY; // This is the 'translateY' value

        const shotElementWidth = shotRect.width; // actual width
        const shotElementHeight = shotRect.height; // actual height

        if (
          currentShotX < lightsaberRight &&
          currentShotX + shotElementWidth > lightsaberLeft &&
          currentShotY < lightsaberTop + lightsaberRect.height && // Check bottom of shot against top of lightsaber
          currentShotY + shotElementHeight > lightsaberTop      // Check top of shot against bottom of lightsaber (hilt)
        ) {
          this.score.update(s => s + 1);
          // Potentially add a sound effect or visual feedback for deflection
          return false; // Remove shot from activeShots (deflected)
        }
      } else if (shot.currentY > 10) { // Give a small grace period for component to render
        console.warn(`BlasterShotComponent instance not found for id: ${shot.id}`);
      }
      return true; // Keep shot
    }));
  }

  ngOnDestroy(): void {
    this.resetGame();
  }
}
