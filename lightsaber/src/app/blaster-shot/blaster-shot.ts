import {Component, ElementRef, HostBinding, input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-blaster-shot',
  imports: [CommonModule],
  templateUrl: './blaster-shot.html',
  styleUrls: ['./blaster-shot.scss']
})
export class BlasterShotComponent implements OnInit {
  id = input.required<string>();
  initialX = input<number>(0);
  initialY = input<number>(0);

  @HostBinding('style.left.px')
  currentX: number = 0;

  @HostBinding('style.top.px')
  currentY: number = 0;

  constructor(public el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.currentX = this.initialX();
    this.currentY = this.initialY();
  }

  // The GameAreaComponent will be responsible for updating currentY to move the shot.
  // This component primarily just holds its state and appearance.
}
