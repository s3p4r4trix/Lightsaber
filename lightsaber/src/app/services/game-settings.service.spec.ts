import { TestBed } from '@angular/core/testing';
import { GameSettingsService } from './game-settings.service';
import { DifficultyMode } from '../models/difficulty.model';
import { signal } from '@angular/core';

describe('GameSettingsService', () => {
  let service: GameSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have Padawan as the default difficulty mode', () => {
    expect(service.getDifficultyMode()()).toEqual(DifficultyMode.Padawan);
  });

  it('should set and get Knight difficulty mode', () => {
    service.setDifficultyMode(DifficultyMode.Knight);
    expect(service.getDifficultyMode()()).toEqual(DifficultyMode.Knight);
  });

  it('should set and get Master difficulty mode', () => {
    service.setDifficultyMode(DifficultyMode.Master);
    expect(service.getDifficultyMode()()).toEqual(DifficultyMode.Master);
  });

  it('should set and get Padawan difficulty mode explicitly', () => {
    // Set to something else first
    service.setDifficultyMode(DifficultyMode.Master);
    // Then set to Padawan
    service.setDifficultyMode(DifficultyMode.Padawan);
    expect(service.getDifficultyMode()()).toEqual(DifficultyMode.Padawan);
  });

  it('getDifficultyMode should return a readonly signal', () => {
    const difficultySignal = service.getDifficultyMode();
    // Check if it's a function (characteristic of a signal)
    expect(typeof difficultySignal).toBe('function');

    // Try to set it (which should not be possible if it's truly readonly,
    // but signals don't have a 'readonly' type in the same way as properties.
    // Instead, we check that it doesn't have a .set method like a WritableSignal)
    expect((difficultySignal as any).set).toBeUndefined();
    expect((difficultySignal as any).update).toBeUndefined();
    expect((difficultySignal as any).mutate).toBeUndefined();
  });
});
