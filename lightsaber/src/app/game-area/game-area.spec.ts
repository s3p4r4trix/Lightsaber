import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameAreaComponent } from './game-area';
import { GameSettingsService } from '../services/game-settings.service';
import { DifficultyMode } from '../models/difficulty.model';
import { LightsaberComponent } from '../lightsaber/lightsaber';
import { BlasterShotComponent } from '../blaster-shot/blaster-shot';
import { CommonModule } from '@angular/common';
import { ElementRef, WritableSignal, signal } from '@angular/core';

// Mock GameSettingsService
class MockGameSettingsService {
  private difficulty = signal<DifficultyMode>(DifficultyMode.Padawan);

  getDifficultyMode = () => this.difficulty.asReadonly();
  setDifficultyMode = (mode: DifficultyMode) => this.difficulty.set(mode);

  // Helper to directly set difficulty for tests
  setCurrentDifficulty(mode: DifficultyMode) {
    this.difficulty.set(mode);
  }
}

// Mock ElementRef
class MockElementRef<T> implements ElementRef<T> {
  nativeElement: T;
  constructor(nativeElement: T) {
    this.nativeElement = nativeElement;
  }
}

describe('GameAreaComponent', () => {
  let component: GameAreaComponent;
  let fixture: ComponentFixture<GameAreaComponent>;
  let mockGameSettingsService: MockGameSettingsService;
  let gameAreaContainerDiv: HTMLDivElement;

  beforeEach(async () => {
    mockGameSettingsService = new MockGameSettingsService();

    // Create a mock gameAreaContainer div
    gameAreaContainerDiv = document.createElement('div');
    // Mock offsetWidth and offsetHeight as they are accessed in ngAfterViewInit
    Object.defineProperty(gameAreaContainerDiv, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(gameAreaContainerDiv, 'offsetHeight', { configurable: true, value: 600 });


    await TestBed.configureTestingModule({
      imports: [CommonModule, GameAreaComponent, LightsaberComponent, BlasterShotComponent], // GameAreaComponent is standalone
      providers: [
        { provide: GameSettingsService, useValue: mockGameSettingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameAreaComponent);
    component = fixture.componentInstance;

    // Manually set the gameAreaContainer as ViewChild is not easily available in tests without nativeElement
    component.gameAreaContainer = new MockElementRef(gameAreaContainerDiv);

    // Mock lightsaber component's element ref for collision checks if needed later, for now, focus on speed
    const mockLightsaberEl = document.createElement('div');
    if (component.lightsaberComponent) { // Check if lightsaberComponent is initialized
      component.lightsaberComponent.el = new MockElementRef(mockLightsaberEl);
    }


    fixture.detectChanges(); // Trigger ngOnInit and ngAfterViewInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with Padawan shot speed by default', () => {
    // ngAfterViewInit calls updateShotSpeed based on the service's default (Padawan)
    expect(component.shotSpeed).toBe(5);
  });

  it('should update shotSpeed when difficulty changes to Knight', fakeAsync(() => {
    mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Knight);
    tick(); // Allow effect to run
    fixture.detectChanges(); // Re-render if necessary
    expect(component.shotSpeed).toBe(10);
  }));

  it('should update shotSpeed when difficulty changes to Master', fakeAsync(() => {
    mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Master);
    tick();
    fixture.detectChanges();
    expect(component.shotSpeed).toBe(20);
  }));

  it('should revert shotSpeed when difficulty changes back to Padawan', fakeAsync(() => {
    // First change to Master
    mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Master);
    tick();
    fixture.detectChanges();
    expect(component.shotSpeed).toBe(20);

    // Then change back to Padawan
    mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Padawan);
    tick();
    fixture.detectChanges();
    expect(component.shotSpeed).toBe(5);
  }));

  it('should call resetGame and startGame when difficulty changes after view init', fakeAsync(() => {
    spyOn(component, 'resetGame').and.callThrough();
    spyOn(component, 'startGame').and.callThrough();

    // Ensure ngAfterViewInit has run and set gameArea dimensions
    component.ngAfterViewInit(); // Call manually to ensure dimensions are set if not already
    tick(); // Allow any async operations in ngAfterViewInit to complete

    mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Knight);
    tick(); // Allow effect to run

    expect(component.resetGame).toHaveBeenCalled();
    expect(component.startGame).toHaveBeenCalled();
  }));

  it('updateShotSpeed should correctly set speeds for all difficulties', () => {
    component.updateShotSpeedAndSpawnTime(DifficultyMode.Padawan);
    expect(component.shotSpeed).toBe(5);

    component.updateShotSpeedAndSpawnTime(DifficultyMode.Knight);
    expect(component.shotSpeed).toBe(10);

    component.updateShotSpeedAndSpawnTime(DifficultyMode.Master);
    expect(component.shotSpeed).toBe(20);
  });

  describe('Blaster Shot Spawning and Movement (related to speed)', () => {
    it('a spawned shot should move according to current shotSpeed (Padawan)', fakeAsync(() => {
      mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Padawan);
      tick(); // apply difficulty
      component.startGame(); // Start game to enable spawning & movement

      component.spawnBlasterShot();
      tick(16); // Simulate one game loop interval for updateGame

      expect(component.activeShots().length).toBe(1);
      expect(component.activeShots()[0].currentY).toBe(5); // Padawan speed

      component.resetGame(); // Cleanup
    }));

    it('a spawned shot should move according to current shotSpeed (Master)', fakeAsync(() => {
      mockGameSettingsService.setCurrentDifficulty(DifficultyMode.Master);
      tick(); // apply difficulty
      component.startGame();

      component.spawnBlasterShot();
      tick(16); // Simulate one game loop interval

      expect(component.activeShots().length).toBe(1);
      expect(component.activeShots()[0].currentY).toBe(20); // Master speed

      component.resetGame(); // Cleanup
    }));
  });

});
