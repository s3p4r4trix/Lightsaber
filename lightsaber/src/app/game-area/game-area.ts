import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
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
  currentX: number; // Current logical X position
  currentY: number; // Current logical Y position
  angleRadian: number; // Angle of the shot in radians
  componentRef?: BlasterShotComponent; // Keep a reference if needed
}


@Component({
  selector: 'app-game-area',
  imports: [CommonModule, LightsaberComponent, BlasterShotComponent],
  templateUrl: './game-area.html',
  styleUrls: ['./game-area.scss']
})
export class GameAreaComponent implements OnDestroy, AfterViewInit {
  @ViewChild('gameAreaContainer') gameAreaContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(LightsaberComponent) lightsaberComponent!: LightsaberComponent;
  @ViewChildren(BlasterShotComponent) blasterShotComponents!: QueryList<BlasterShotComponent>;

  gameSettingsService = inject(GameSettingsService);
  currentGameState = this.gameSettingsService.getGameState();
  BodyPart = BodyPart; // Expose enum to template
  GameState = GameState; // Expose enum to template
  activeShots = signal<BlasterShot[]>([]);
  score = signal<number>(0);
  hitBodyParts = signal<Set<BodyPart>>(new Set());
  isGameOver = signal<boolean>(false);
  killingBlowPart = signal<BodyPart | null>(null); // Stores the part that caused game over
  availableBodyParts: BodyPart[] = Object.values(BodyPart).filter(value => typeof value === 'number') as BodyPart[];

  #gameLoopInterval: any;
  #shotTimerId: any; // For randomized shot timing
  #gameAreaWidth: number = 0;
  #gameAreaHeight: number = 0;

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
          this.resetGame(); // Ensure a clean state before starting
          // Use Promise.resolve().then() to ensure view updates and @ViewChild are available
          Promise.resolve().then(() => {
            if (!this.gameAreaContainer || !this.gameAreaContainer.nativeElement) {
              console.error("CRITICAL: GameAreaComponent's gameAreaContainer not found when trying to start game in Playing state.");
              return;
            }
            this.#gameAreaWidth = this.gameAreaContainer.nativeElement.offsetWidth;
            this.#gameAreaHeight = this.gameAreaContainer.nativeElement.offsetHeight;

            if (this.lightsaberComponent) {
              console.log("LightsaberComponent found, proceeding to start game.");
            } else {
              console.error("CRITICAL: LightsaberComponent not found when trying to start game in Playing state. Deflection will not work reliably.");
            }
            this.startGame();
          });
          break;
        case GameState.DifficultySelection:
        case GameState.GameOver:
          this.stopGameMechanics(); // Stop intervals, timeouts
          break;
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.gameAreaContainer || !this.gameAreaContainer.nativeElement) {
      console.error("Game area container not found!");
      return;
    }
    this.#gameAreaWidth = this.gameAreaContainer.nativeElement.offsetWidth;
    this.#gameAreaHeight = this.gameAreaContainer.nativeElement.offsetHeight;

    // Initialize shot speed based on current difficulty setting
    this.updateShotSpeedAndSpawnTime(this.gameSettingsService.getDifficultyMode()());

    if (this.lightsaberComponent && this.lightsaberComponent.el && this.lightsaberComponent.el.nativeElement) {
      // Pass game area reference to lightsaber if needed, or ensure lightsaber can find it.
      // The lightsaber currently tries to find '.game-area-container' itself.
    } else {
      console.warn("LightsaberComponent not found during ngAfterViewInit. This is expected if the initial game state does not render it. Availability will be confirmed when the game starts.");
    }
  }

  updateShotSpeedAndSpawnTime(difficulty: DifficultyMode): void {
    switch (difficulty) {
      case DifficultyMode.Knight:
        this.shotSpeed = 8;
        this.shotSpawnRate = 1250; // Base for first shot, then random
        break;
      case DifficultyMode.Master:
        this.shotSpeed = 12;
        this.shotSpawnRate = 1000; // Base for first shot, then random
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
    if (this.#gameLoopInterval) {
      clearInterval(this.#gameLoopInterval);
    }
    if (this.#shotTimerId) {
      clearTimeout(this.#shotTimerId);
    }

    // Reset game values
    this.activeShots.set([]);
    this.score.set(0);
    this.hitBodyParts.set(new Set());
    this.isGameOver.set(false);
    this.killingBlowPart.set(null);
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
    this.#gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, 10); // Roughly 100 FPS

    // Schedule the first shot
    this.#shotTimerId = setTimeout(() => {
      this.spawnBlasterShot();
    }, this.shotSpawnRate); // Use current shotSpawnRate for the very first shot
  }

  stopGameMechanics(): void {
    if (this.#gameLoopInterval) {
      clearInterval(this.#gameLoopInterval);
      this.#gameLoopInterval = null; // Ensure it's marked as cleared
    }
    if (this.#shotTimerId) {
      clearTimeout(this.#shotTimerId);
      this.#shotTimerId = null; // Ensure it's marked as cleared
    }
    console.log('Game mechanics stopped.');
    // Clear active shots on game over
    this.activeShots.set([]);
  }

  registerHit(): void {
    if (this.isGameOver()) return;

    if (!this.availableBodyParts || !Array.isArray(this.availableBodyParts) || this.availableBodyParts.length === 0) {
      console.error('CRITICAL: availableBodyParts is not initialized correctly or is empty. Cannot register hit.');
      return; // Prevent further execution if parts aren't available
    }

    const unhitParts = this.availableBodyParts.filter(part => !this.hitBodyParts().has(part));

    let selectableParts: BodyPart[];

    // If there are other parts available besides Head, exclude Head from selection.
    if (unhitParts.length > 1 && unhitParts.includes(BodyPart.Head)) {
      selectableParts = unhitParts.filter(part => part !== BodyPart.Head);
    }
      // If Head is the only unhit part, or if Head is not in unhitParts (e.g. already hit, though game should be over)
      // or unhitParts is empty (should be caught by next check), then selectableParts is unhitParts.
    // This also covers the case where unhitParts contains only Head.
    else {
      selectableParts = unhitParts;
    }

    // Safeguard: if selectableParts is empty, log an error and return.
    // This might happen if unhitParts was empty or logic above leads to empty selectableParts.
    if (selectableParts.length === 0) {
      // If unhitParts is also empty, it means all parts are hit.
      // If the game is not over yet, this indicates a potential issue with game over logic or part management.
      if (unhitParts.length === 0) {
        console.error('CRITICAL: All parts hit but game not over, or registerHit called inappropriately.');
      } else {
        console.error('CRITICAL: selectableParts ended up empty in registerHit. Unhit parts:', unhitParts.map(p => BodyPart[p]).join(', '));
      }
      return;
    }

    const randomPartIndex = Math.floor(Math.random() * selectableParts.length);
    const partJustHit = selectableParts[randomPartIndex];

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
        randomDelay = Math.random() * 250 + 1000; // 1000 to 1250 ms
        break;
      case DifficultyMode.Master:
        randomDelay = Math.random() * 250 + 750; // 750 to 1000 ms
        break;
      case DifficultyMode.Padawan:
      default:
        randomDelay = this.shotSpawnRate; // Use the fixed rate set in updateShotSpeedAndSpawnTime
        break;
    }

    this.#shotTimerId = setTimeout(() => {
      this.spawnBlasterShot();
    }, randomDelay);
  }

  spawnBlasterShot(): void {
    if (this.isGameOver() || !this.#gameAreaWidth || this.#gameAreaHeight === 0) return;

    const shotWidth = 8; // Approximate width of blaster-shot, should match CSS
    const initialX = Math.random() * (this.#gameAreaWidth - shotWidth);
    const targetX = Math.random() * (this.#gameAreaWidth - shotWidth); // Target X at the bottom

    // Calculate angle
    // Vector from (initialX, 0) to (targetX, this.gameAreaHeight)
    const deltaX = targetX - initialX;
    const deltaY = this.#gameAreaHeight; // Always positive, shots move downwards
    const angleRadian = Math.atan2(deltaY, deltaX);

    const newShot: BlasterShot = {
      id: `shot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      currentX: initialX,
      currentY: 0, // Start at the top
      angleRadian: angleRadian,
    };
    this.activeShots.update(shots => [...shots, newShot]);
    this.scheduleNextShot(); // Schedule the next shot
  }

  updateGame(): void {
    if (!this.lightsaberComponent || !this.lightsaberComponent.el || !this.gameAreaContainer) {
      return;
    }

    const gameAreaRect = this.gameAreaContainer.nativeElement.getBoundingClientRect();

    // Move shots and check for collisions
    this.activeShots.update(shots => shots.filter(shot => {
      console.log(`Processing shot ${shot.id} at Y: ${shot.currentY}, X: ${shot.currentX}, Speed: ${this.shotSpeed}, Angle: ${shot.angleRadian}`);
      // Update shot position based on angle and speed
      shot.currentX += Math.cos(shot.angleRadian) * this.shotSpeed;
      shot.currentY += Math.sin(shot.angleRadian) * this.shotSpeed;

      console.log(`Shot ${shot.id} BEFORE FIND. Updated Y: ${shot.currentY}`);
      const shotComponentInstance = this.blasterShotComponents.find(c => c.id() === shot.id);
      console.log(`Shot ${shot.id} AFTER FIND. Instance found: ${!!shotComponentInstance}`);

      if (shotComponentInstance) {
        console.log(`Shot ${shot.id} BEFORE COMPONENT UPDATE. currentX: ${shotComponentInstance.currentX}, currentY: ${shotComponentInstance.currentY}`);
        shotComponentInstance.currentX = shot.currentX;
        shotComponentInstance.currentY = shot.currentY;
        console.log(`Shot ${shot.id} AFTER COMPONENT UPDATE. new currentX: ${shotComponentInstance.currentX}, new currentY: ${shotComponentInstance.currentY}`);
      } else if (shot.currentY < this.#gameAreaHeight / 2) { // Only warn if shot is relatively new and component not found
        console.warn(`BlasterShotComponent instance not found for id: ${shot.id} early in its lifecycle. Shot Y: ${shot.currentY}`);
      }
      console.log(`Shot ${shot.id} AFTER COMPONENT LOGIC. Y: ${shot.currentY}`);

      // Remove shot if it goes off-screen (top - deflected)
      if (shot.currentY < 0) {
        return false; // Remove from activeShots
      }

      // Remove shot if it goes off-screen (bottom, left, or right)
      if (shot.currentY >= this.#gameAreaHeight) {
        console.log(`Shot ${shot.id} CROSSED bottom boundary. currentY: ${shot.currentY}, gameAreaHeight: ${this.#gameAreaHeight}`);
        shot.currentY = this.#gameAreaHeight; // Explicitly set Y to gameAreaHeight

        // Update the component's visual position immediately if possible
        const componentInst = this.blasterShotComponents.find(c => c.id() === shot.id);
        if (componentInst) {
          componentInst.currentY = shot.currentY;
        }

        console.log(`Shot ${shot.id} PRE-REGISTER_HIT. Adjusted Y: ${shot.currentY}. Calling registerHit now.`);
        this.registerHit(); // Register a hit
        return false; // Remove from activeShots
      }

      // Separate condition for shots going off left or right, without registering a hit
      if (shot.currentX < 0 || shot.currentX > this.#gameAreaWidth) {
        return false; // Remove from activeShots
      }

      // Collision detection
      if (shotComponentInstance && shotComponentInstance.el && shotComponentInstance.el.nativeElement) {
        // TODO: Ideally, get these from LightsaberComponent's properties
        const beamHeight = 150; // px
        const hiltHeight = 40; // px
        const bladeWidth = 10; // px

        // Get Lightsaber State Directly
        const tiltAngleDeg = this.lightsaberComponent.tiltAngle();
        const tiltAngleRad = tiltAngleDeg * (Math.PI / 180);

        // Game Area Relative Lightsaber Pivot Position
        // lightsaberRect is already available from outer scope
        const pivotX_gameAreaRelative = this.lightsaberComponent.positionX() - gameAreaRect.left;

        // New calculation for pivotY_gameAreaRelative
        const componentElementHeight = beamHeight + hiltHeight;
        const transformOriginY_inElement = beamHeight + hiltHeight / 2;
        // This next line replicates the LightsaberComponent's style.transform calculation for translateY
        const appliedTranslateY = this.lightsaberComponent.positionY() - componentElementHeight;
        const pivotY_viewport = appliedTranslateY + transformOriginY_inElement;
        const pivotY_gameAreaRelative = pivotY_viewport - gameAreaRect.top;

        // Implement generous collision model
        const collisionBladeWidth = bladeWidth + 10; // Make collision blade 10px wider than visual (bladeWidth is 10px)

        const localPoints = [
          { x: -collisionBladeWidth / 2, y: -(beamHeight + hiltHeight / 2) }, // Tip-left
          { x:  collisionBladeWidth / 2, y: -(beamHeight + hiltHeight / 2) }, // Tip-right
          { x:  collisionBladeWidth / 2, y: -hiltHeight / 2 },                // Hilt-join-right
          { x: -collisionBladeWidth / 2, y: -hiltHeight / 2 }                 // Hilt-join-left
        ];

        const bladePolygon_gameAreaRelative = localPoints.map(p => {
          const rotatedX = p.x * Math.cos(tiltAngleRad) - p.y * Math.sin(tiltAngleRad);
          const rotatedY = p.x * Math.sin(tiltAngleRad) + p.y * Math.cos(tiltAngleRad);
          return {
            x: rotatedX + pivotX_gameAreaRelative,
            y: rotatedY + pivotY_gameAreaRelative
          };
        });

        // Calculate shot center point
        const shotRect = shotComponentInstance.el.nativeElement.getBoundingClientRect();
        const shotCenterX_gameAreaRelative = (shotRect.left - gameAreaRect.left) + (shotRect.width / 2);
        const shotCenterY_gameAreaRelative = (shotRect.top - gameAreaRect.top) + (shotRect.height / 2);
        const shotCenterPoint_gameAreaRelative = { x: shotCenterX_gameAreaRelative, y: shotCenterY_gameAreaRelative };

        if (this.#isPointInPolygon(shotCenterPoint_gameAreaRelative, bladePolygon_gameAreaRelative)) {

          const incidentAngleRad = shot.angleRadian;

          // Deflection Logic
          const currentTiltRad = tiltAngleRad; // Use already calculated tiltAngleRad

          const baseUpAngleRad = -Math.PI / 2; // Straight up
          const tiltInfluenceFactor = 0.8;

          shot.angleRadian = baseUpAngleRad + (currentTiltRad * tiltInfluenceFactor);

          console.log(`New Deflection: Shot ${shot.id} original angle ${incidentAngleRad.toFixed(2)}, new angle ${shot.angleRadian.toFixed(2)} (Tilt: ${tiltAngleDeg.toFixed(1)}deg)`);

          this.score.update(s => s + 1);
          // Shot is deflected, not removed.
        }
      }
      return true; // Keep shot if not off-screen and not deflected (or deflected and updated)
    }));
  }

  ngOnDestroy(): void {
    this.resetGame();
  }

  #checkAndProcessGameOver(newlyHitPart: BodyPart): void {
    if (this.isGameOver()) return; // Already game over, no need to re-check

    // Only a headshot can end the game.
    if (newlyHitPart === BodyPart.Head) {
      this.isGameOver.set(true);
      this.killingBlowPart.set(BodyPart.Head); // Set killingBlowPart to Head
      this.gameSettingsService.setGameState(GameState.GameOver);
      this.stopGameMechanics();
      // Log the game over condition, ensuring 'currentHits' is defined or accessed safely if needed for logging.
      // For simplicity, let's assume currentHits is not strictly needed for this log message anymore,
      // or ensure it's declared if its contents are desired in the log.
      const currentHits = this.hitBodyParts(); // Ensure currentHits is available if used in logging
      console.log(`Game Over triggered by: Head. Full hits: ${Array.from(currentHits).map(p => BodyPart[p]).join(', ')}`);
    }
  }

  // Helper function for collision detection
  #isPointInPolygon(point: { x: number, y: number }, polygon: { x: number, y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
