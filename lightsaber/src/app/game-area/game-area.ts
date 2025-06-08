import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LightsaberComponent} from '../lightsaber/lightsaber';
import {BlasterShotComponent} from '../blaster-shot/blaster-shot';
import {GameSettingsService} from '../services/game-settings.service';
import {DifficultyMode} from '../models/difficulty.model';
import {GameState} from '../models/game-state.model';
import {BodyPart} from '../models/body-part.model';

interface BlasterShot {
  id: string;
  x: number;
  y: number;
  currentY: number; // Used for animation directly in template
  componentRef?: BlasterShotComponent; // Keep a reference if needed, though not strictly for this approach
}


@Component({
  selector: 'app-game-area',
  imports: [CommonModule, LightsaberComponent, BlasterShotComponent],
  templateUrl: './game-area.html',
  styleUrls: ['./game-area.scss']
})
export class GameAreaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameAreaContainer') gameAreaContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(LightsaberComponent) lightsaberComponent!: LightsaberComponent;
  @ViewChildren(BlasterShotComponent) blasterShotComponents!: QueryList<BlasterShotComponent>;

  gameSettingsService = inject(GameSettingsService);
  currentGameState = this.gameSettingsService.getGameState();
  public BodyPart = BodyPart; // Expose enum to template
  public GameState = GameState; // Expose enum to template
  activeShots = signal<BlasterShot[]>([]);
  score = signal<number>(0);
  hitBodyParts = signal<Set<BodyPart>>(new Set());
  printHitBodyParts = computed(() => Array.from(this.hitBodyParts()).map(part => BodyPart[part]).join(', '));
  isGameOver = signal<boolean>(false);
  killingBlowPart = signal<BodyPart | null>(null); // Stores the part that caused game over
  availableBodyParts: BodyPart[] = Object.values(BodyPart).filter(value => typeof value === 'number') as BodyPart[];

  private gameLoopInterval: any;
  private shotTimerId: any; // For randomized shot timing
  private gameAreaWidth: number = 0;
  private gameAreaHeight: number = 0;

  shotSpeed: number = 5; // Pixels per frame
  shotSpawnRate: number = 1500; // Milliseconds (used for Padawan and first shot)

  constructor() {
    // Effect to react to difficulty changes
    effect(() => {
      const currentDifficulty = this.gameSettingsService.getDifficultyMode()();
      console.log('Difficulty changed to:', currentDifficulty);
      this.updateShotSpeedAndSpawnTime(currentDifficulty); // Update speed first
      // resetGame and startGame are now handled by the GameState effect
    });

    // Effect to react to GameState changes
    effect(() => {
      const state = this.currentGameState();
      console.log('GameState changed to:', state);
      switch (state) {
        case GameState.Playing:
          this.resetGame(); // Ensure clean state before starting
          this.startGame();
          break;
        case GameState.DifficultySelection:
        case GameState.GameOver:
          this.stopGameMechanics(); // Stop intervals, timeouts
          break;
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
    this.updateShotSpeedAndSpawnTime(this.gameSettingsService.getDifficultyMode()());

    if (this.lightsaberComponent && this.lightsaberComponent.el && this.lightsaberComponent.el.nativeElement) {
      // Pass game area reference to lightsaber if needed, or ensure lightsaber can find it.
      // The lightsaber currently tries to find '.game-area-container' itself.
    } else {
      console.error("Lightsaber component not found after view init!");
    }
  }

  updateShotSpeedAndSpawnTime(difficulty: DifficultyMode): void {
    switch (difficulty) {
      case DifficultyMode.Knight:
        this.shotSpeed = 10; // Base speed (5) * 2
        this.shotSpawnRate = 1000; // Base for first shot, then random
        break;
      case DifficultyMode.Master:
        this.shotSpeed = 20; // Base speed (5) * 4
        this.shotSpawnRate = 500; // Base for first shot, then random
        break;
      case DifficultyMode.Padawan:
      default:
        this.shotSpeed = 5; // Base speed
        this.shotSpawnRate = 1500; // Fixed rate for Padawan
        break;
    }
    console.log(`Shot speed updated to: ${this.shotSpeed}, base spawn rate: ${this.shotSpawnRate} for difficulty: ${difficulty}`);
  }

  resetGame(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    if (this.shotTimerId) {
      clearTimeout(this.shotTimerId);
    }
    this.activeShots.set([]); // Clear any existing shots
    this.score.set(0); // Reset score
    this.hitBodyParts.set(new Set()); // Reset hit body parts
    this.isGameOver.set(false); // Reset game over state
    this.killingBlowPart.set(null); // Reset killing blow part
    console.log('Game has been reset.');
  }

  startGame(): void {
    if (this.currentGameState() !== GameState.Playing) {
      console.log('Not in Playing state, startGame() aborted.');
      return;
    }

    // activeShots and score are reset in resetGame.
    this.activeShots.set([]);
    this.score.set(0);

    console.log('startGame called in Playing state.');
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, 16); // Roughly 60 FPS

    // Schedule the first shot
    this.shotTimerId = setTimeout(() => {
      this.spawnBlasterShot();
    }, this.shotSpawnRate); // Use current shotSpawnRate for the very first shot
  }

  stopGameMechanics(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null; // Ensure it's marked as cleared
    }
    if (this.shotTimerId) {
      clearTimeout(this.shotTimerId);
      this.shotTimerId = null; // Ensure it's marked as cleared
    }
    console.log('Game mechanics stopped.');
    // Optionally clear active shots on game over
    // this.activeShots.set([]);
  }

  registerHit(): void {
    if (this.isGameOver()) return;

    if (!this.availableBodyParts || !Array.isArray(this.availableBodyParts) || this.availableBodyParts.length === 0) {
      console.error('CRITICAL: availableBodyParts is not initialized correctly or is empty. Cannot register hit.');
      return; // Prevent further execution if parts aren't available
    }

    const unhitParts = this.availableBodyParts.filter(part => !this.hitBodyParts().has(part));

    if (unhitParts.length === 0) {
      // All parts hit, this could be an alternative game over or just stop registering.
      // For now, if all parts are hit and it wasn't game over by other conditions,
      // it implies the game continues or needs another condition.
      // We already check isGameOver at the start.
      console.log('All body parts have been hit.');
      // Potentially trigger a different game over if all parts hit is a specific condition
      this.isGameOver.set(true);
      this.stopGameMechanics();
      return;
    }

    const randomPartIndex = Math.floor(Math.random() * unhitParts.length);
    const partJustHit = unhitParts[randomPartIndex];
    this.hitBodyParts.update(currentParts => new Set(currentParts).add(partJustHit));
    console.log('Registered hit on:', BodyPart[partJustHit]);
    this.#checkAndProcessGameOver(partJustHit); // Call the new method with the part that was just hit
  }

  scheduleNextShot(): void {
    if (this.isGameOver()) return;

    const currentDifficulty = this.gameSettingsService.getDifficultyMode()();
    let randomDelay: number;

    switch (currentDifficulty) {
      case DifficultyMode.Knight:
        randomDelay = Math.random() * 500 + 500; // 500 to 1000 ms
        break;
      case DifficultyMode.Master:
        randomDelay = Math.random() * 250 + 250; // 250 to 500 ms
        break;
      case DifficultyMode.Padawan:
      default:
        randomDelay = this.shotSpawnRate; // Use the fixed rate set in updateShotSpeedAndSpawnTime
        break;
    }

    this.shotTimerId = setTimeout(() => {
      this.spawnBlasterShot();
    }, randomDelay);
  }

  spawnBlasterShot(): void {
    if (this.isGameOver() || !this.gameAreaWidth) return; // Do not spawn if game is over or width not set

    const shotWidth = 8; // Approximate width of blaster-shot, should match CSS if possible
    const randomX = Math.random() * (this.gameAreaWidth - shotWidth);
    const newShot: BlasterShot = {
      id: `shot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      x: randomX,
      y: 0, // Start at the top
      currentY: 0,
    };
    this.activeShots.update(shots => [...shots, newShot]);
    this.scheduleNextShot(); // Schedule the next shot
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

      // Remove shot if it goes off-screen (bottom)
      if (shot.currentY > this.gameAreaHeight) {
        this.registerHit(); // Register a hit when a shot is missed
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

  #checkAndProcessGameOver(newlyHitPart: BodyPart): void {
    if (this.isGameOver()) return; // Already game over, no need to re-check

    const currentHits = this.hitBodyParts();
    let gameOverTriggeredBy: BodyPart | null = null;

    // Check conditions based on the newly hit part
    if (newlyHitPart === BodyPart.Head && currentHits.has(BodyPart.Head)) {
      gameOverTriggeredBy = BodyPart.Head;
    } else if (newlyHitPart === BodyPart.Torso && currentHits.has(BodyPart.Torso)) {
      gameOverTriggeredBy = BodyPart.Torso;
    } else if (
      (newlyHitPart === BodyPart.LeftArm || newlyHitPart === BodyPart.RightArm) &&
      currentHits.has(BodyPart.LeftArm) &&
      currentHits.has(BodyPart.RightArm)
    ) {
      // If an arm was hit and now both are hit, that arm is the trigger
      gameOverTriggeredBy = newlyHitPart;
    }

    // Note: If a non-critical part like a leg is hit, gameOverTriggeredBy remains null.
    if (gameOverTriggeredBy !== null) {
      this.isGameOver.set(true);
      this.killingBlowPart.set(gameOverTriggeredBy);
      this.gameSettingsService.setGameState(GameState.GameOver);
      this.stopGameMechanics();
      console.log(`Game Over triggered by: ${BodyPart[gameOverTriggeredBy]}. Full hits: ${Array.from(currentHits).map(p => BodyPart[p]).join(', ')}`);
    }
  }
}
