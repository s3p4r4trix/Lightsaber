import { Component, Input, OnInit, HostBinding, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blaster-shot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blaster-shot.html',
  styleUrls: ['./blaster-shot.scss']
})
export class BlasterShotComponent implements OnInit {
  @Input() initialX: number = 0;
  @Input() initialY: number = 0;

  @HostBinding('style.left.px')
  currentX: number = 0;

  @HostBinding('style.top.px')
  currentY: number = 0;

  public id: string = `blaster-shot-${Math.random().toString(36).substring(2, 9)}`; // Unique ID for tracking

  constructor(public el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.currentX = this.initialX;
    this.currentY = this.initialY;
  }

  // The GameAreaComponent will be responsible for updating currentY to move the shot.
  // This component primarily just holds its state and appearance.
}
