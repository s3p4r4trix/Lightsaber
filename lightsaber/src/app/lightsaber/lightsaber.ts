import { Component, HostListener, ElementRef, Renderer2, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for [style.left.px]

@Component({
  selector: 'app-lightsaber',
  standalone: true,
  imports: [CommonModule], // Import CommonModule
  templateUrl: './lightsaber.html',
  styleUrls: ['./lightsaber.scss']
})
export class LightsaberComponent implements OnInit {
  positionX: number = 0;
  private gameAreaElement: HTMLElement | null = null; // To constrain movement within game area

  constructor(public el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    // Attempt to find the game-area element to constrain the lightsaber
    // This assumes the lightsaber is a child of game-area or they share a common, identifiable parent
    // A more robust solution might involve a service or Input property if direct DOM traversal is not desired
    this.gameAreaElement = document.querySelector('.game-area-container'); // Assuming game-area has this class

    // Set initial position to the center of the game area if possible
    if (this.gameAreaElement) {
      this.positionX = this.gameAreaElement.offsetWidth / 2;
    } else {
      this.positionX = window.innerWidth / 2; // Fallback to window width
    }
    this.updatePosition();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.gameAreaElement) {
      const gameAreaRect = this.gameAreaElement.getBoundingClientRect();
      // Calculate mouse position relative to the game area
      this.positionX = event.clientX - gameAreaRect.left;
      // Constrain lightsaber within the game area boundaries
      const lightsaberWidth = this.el.nativeElement.offsetWidth;
      this.positionX = Math.max(lightsaberWidth / 2, this.positionX);
      this.positionX = Math.min(gameAreaRect.width - lightsaberWidth / 2, this.positionX);
    } else {
      // Fallback if game-area is not found (less accurate)
      this.positionX = event.clientX;
    }
    this.updatePosition();
  }

  private updatePosition() {
    // Use renderer for better abstraction, or directly set style if preferred
    // this.renderer.setStyle(this.el.nativeElement, 'left', `${this.positionX - (this.el.nativeElement.offsetWidth / 2)}px`);
    // Using [style.left.px] in the template is cleaner if CommonModule is imported.
    // For direct style manipulation for performance:
    this.el.nativeElement.style.left = `${this.positionX - (this.el.nativeElement.offsetWidth / 2)}px`;
  }
}
