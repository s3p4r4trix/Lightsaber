import { Component, HostListener, ElementRef, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for [style.left.px]

@Component({
  selector: 'app-lightsaber',
  standalone: true,
  imports: [CommonModule], // Import CommonModule
  templateUrl: './lightsaber.html',
  styleUrls: ['./lightsaber.scss']
})
export class LightsaberComponent implements OnInit {
  positionX = signal<number>(0);
  positionY = signal<number>(0);
  tiltAngle = signal<number>(0);
  private readonly beamHeight: number = 150;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private gameAreaElement: HTMLElement | null = null; // To constrain movement within game area

  constructor(public el: ElementRef<HTMLElement>) {
    // Effect for position and TILT
    effect(() => {
      const currentPositionX = this.positionX();
      const currentPositionY = this.positionY(); // Read the Y position
      const currentTiltAngle = this.tiltAngle(); // Get tilt angle

      const elementWidth = this.el.nativeElement.offsetWidth;
      const elementHeight = this.el.nativeElement.offsetHeight; // Get element height

      // Combined transform for position and rotation
      this.el.nativeElement.style.transform =
        `translateX(${currentPositionX - (elementWidth / 2)}px) ` +
        `translateY(${currentPositionY - this.beamHeight}px) ` +
        `rotateZ(${currentTiltAngle}deg)`;
    });
  }

  ngOnInit(): void {
    this.prevMouseX = 0; // Initialize prevMouseX
    this.prevMouseY = 0; // Initialize prevMouseY
    // If gameAreaElement was only for X positioning and bounds, it might not be necessary anymore.
    // For this subtask, its querySelector line is removed.
    this.gameAreaElement = null;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Existing X position and deltaX calculation
    const newX = event.clientX;
    this.positionX.set(newX);
    const deltaX = newX - this.prevMouseX;
    this.prevMouseX = newX;

    // New Y position and deltaY calculation
    const newY = event.clientY;
    this.positionY.set(newY); // Update positionY signal
    const deltaY = newY - this.prevMouseY;
    this.prevMouseY = newY;

    // Determine maximum tilt magnitude
    let maxTiltMagnitude = 90;
    if (deltaY < 0) { // Mouse moving up
      maxTiltMagnitude = 120;
    }

    // Tilt logic based on deltaX (horizontal movement)
    const tiltSensitivityFactor = 0.5; // Should be existing
    let calculatedTilt = -deltaX * tiltSensitivityFactor;

    // Clamp the tilt angle using the determined maxTiltMagnitude
    const finalTilt = Math.max(-maxTiltMagnitude, Math.min(maxTiltMagnitude, calculatedTilt));

    this.tiltAngle.set(finalTilt);
  }
}
