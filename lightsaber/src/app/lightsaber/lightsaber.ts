import {Component, effect, ElementRef, HostListener, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common'; // Required for [style.left.px]

@Component({
  selector: 'app-lightsaber',
  imports: [CommonModule], // Import CommonModule
  templateUrl: './lightsaber.html',
  styleUrls: ['./lightsaber.scss']
})
export class LightsaberComponent implements OnInit {
  positionX = signal<number>(0);
  positionY = signal<number>(0);
  tiltAngle = signal<number>(0);
  private readonly beamHeight: number = 150;
  private readonly hiltHeight: number = 40;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private gameAreaElement: HTMLElement | null = null; // To constrain movement within game area

  // Properties for tilt return mechanism
  private lastMouseActivityTime: number = Date.now();
  private readonly MOUSE_IDLE_TIMEOUT_MS = 100;
  private readonly TILT_RETURN_INTERVAL_MS = 50;
  private readonly TILT_DECAY_FACTOR = 0.8;
  private readonly MIN_TILT_TO_RETURN = 0.5;

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
        `translateY(${currentPositionY - (elementHeight * 6.1)}px) ` +
        `rotateZ(${currentTiltAngle}deg)`;
    });
  }

  ngOnInit(): void {
    this.prevMouseX = 0; // Initialize prevMouseX
    this.prevMouseY = 0; // Initialize prevMouseY

    // Ensure transformOrigin is set here; once nativeElement is available
    this.el.nativeElement.style.transformOrigin = `50% ${this.beamHeight + (this.hiltHeight / 2)}px`; // Updated line

    setInterval(() => {
      if (Date.now() - this.lastMouseActivityTime > this.MOUSE_IDLE_TIMEOUT_MS) {
        if (Math.abs(this.tiltAngle()) > this.MIN_TILT_TO_RETURN) {
          this.tiltAngle.set(this.tiltAngle() * this.TILT_DECAY_FACTOR);
        } else if (this.tiltAngle() !== 0) {
          this.tiltAngle.set(0); // Snap to zero if very close
        }
      }
    }, this.TILT_RETURN_INTERVAL_MS);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.lastMouseActivityTime = Date.now(); // Update activity time

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
    const tiltSensitivityFactor = 0.7; // Should be existing
    let calculatedTilt = -deltaX * tiltSensitivityFactor;

    // Clamp the tilt angle using the determined maxTiltMagnitude
    const finalTilt = Math.max(-maxTiltMagnitude, Math.min(maxTiltMagnitude, calculatedTilt));

    this.tiltAngle.set(finalTilt);
  }
}
