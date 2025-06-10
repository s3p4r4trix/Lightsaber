import {Component, effect, ElementRef, HostListener, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common'; // Required for [style.left.px]

@Component({
  selector: 'app-lightsaber',
  imports: [CommonModule],
  templateUrl: './lightsaber.html',
  styleUrls: ['./lightsaber.scss']
})
export class LightsaberComponent implements OnInit {
  positionX = signal<number>(window.innerWidth / 2);
  positionY = signal<number>(window.innerHeight / 2);
  tiltAngle = signal<number>(0);

  // Properties for damped movement
  #targetX: number = 0;
  #targetY: number = 0;
  readonly #dampingFactor: number = 0.12;
  #movementInterval: any;

  readonly #beamHeight: number = 150;
  readonly #hiltHeight: number = 40;
  #prevMouseX: number = 0;
  #prevMouseY: number = 0;

  // Properties for tilt return mechanism
  #lastMouseActivityTime: number = Date.now();
  readonly MOUSE_IDLE_TIMEOUT_MS = 100;
  readonly TILT_RETURN_INTERVAL_MS = 50;
  readonly TILT_DECAY_FACTOR = 0.8;
  readonly MIN_TILT_TO_RETURN = 0.5;

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
    // Initialize positions
    this.positionX.set(window.innerWidth / 2);
    this.#targetX = window.innerWidth / 2;
    this.positionY.set(window.innerHeight / 2);
    this.#targetY = window.innerHeight / 2;

    this.#prevMouseX = window.innerWidth / 2; // Initialize prevMouseX to current position
    this.#prevMouseY = window.innerHeight / 2; // Initialize prevMouseY to current position

    // Ensure transformOrigin is set here; once nativeElement is available
    this.el.nativeElement.style.transformOrigin = `50% ${this.#beamHeight + (this.#hiltHeight / 2)}px`; // Updated line

    // Tilt decay interval (existing)
    setInterval(() => {
      if (Date.now() - this.#lastMouseActivityTime > this.MOUSE_IDLE_TIMEOUT_MS) {
        if (Math.abs(this.tiltAngle()) > this.MIN_TILT_TO_RETURN) {
          this.tiltAngle.set(this.tiltAngle() * this.TILT_DECAY_FACTOR);
        } else if (this.tiltAngle() !== 0) {
          this.tiltAngle.set(0); // Snap to zero if very close
        }
      }
    }, this.TILT_RETURN_INTERVAL_MS);

    // Damped movement interval
    this.#movementInterval = setInterval(() => {
      this.positionX.update(current => current + (this.#targetX - current) * this.#dampingFactor);
      this.positionY.update(current => current + (this.#targetY - current) * this.#dampingFactor);
    }, 16); // Target ~60FPS
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.#lastMouseActivityTime = Date.now(); // Update activity time

    const newX = event.clientX;
    const newY = event.clientY;

    this.#targetX = newX;
    this.#targetY = newY;

    // Delta calculation for tilt (remains the same)
    const deltaX = newX - this.#prevMouseX;
    this.#prevMouseX = newX;
    const deltaY = newY - this.#prevMouseY;
    this.#prevMouseY = newY;

    // Determine maximum tilt magnitude
    let maxTiltMagnitude = 90;

    // Tilt logic based on deltaX (horizontal movement)
    const tiltSensitivityFactor = 0.8; // Should be existing
    let calculatedTilt = -deltaX * tiltSensitivityFactor;

    // Clamp the tilt angle using the determined maxTiltMagnitude
    const finalTilt = Math.max(-maxTiltMagnitude, Math.min(maxTiltMagnitude, calculatedTilt));

    this.tiltAngle.set(finalTilt);
  }
}
