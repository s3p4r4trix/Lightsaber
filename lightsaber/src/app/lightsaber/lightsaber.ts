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
  private gameAreaElement: HTMLElement | null = null; // To constrain movement within game area

  constructor(public el: ElementRef<HTMLElement>) {
    effect(() => {
      const currentPositionX = this.positionX();
      const elementWidth = this.el.nativeElement.offsetWidth;
      this.el.nativeElement.style.left = `${currentPositionX - (elementWidth / 2)}px`;
    });
  }

  ngOnInit(): void {
    // Attempt to find the game-area element to constrain the lightsaber
    // This assumes the lightsaber is a child of game-area or they share a common, identifiable parent
    // A more robust solution might involve a service or Input property if direct DOM traversal is not desired
    this.gameAreaElement = document.querySelector('.game-area-container'); // Assuming game-area has this class

    // Set initial position to the center of the game area if possible
    if (this.gameAreaElement) {
      this.positionX.set(this.gameAreaElement.offsetWidth / 2);
    } else {
      this.positionX.set(window.innerWidth / 2); // Fallback to window width
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    let newX = 0;
    if (this.gameAreaElement) {
      const gameAreaRect = this.gameAreaElement.getBoundingClientRect();
      // Calculate mouse position relative to the game area
      newX = event.clientX - gameAreaRect.left;
      // Constrain lightsaber within the game area boundaries
      const lightsaberWidth = this.el.nativeElement.offsetWidth;
      newX = Math.max(lightsaberWidth / 2, newX);
      newX = Math.min(gameAreaRect.width - lightsaberWidth / 2, newX);
    } else {
      // Fallback if game-area is not found (less accurate)
      newX = event.clientX;
    }
    this.positionX.set(newX);
  }
}
