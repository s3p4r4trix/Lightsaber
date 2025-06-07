import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameAreaComponent } from './game-area/game-area';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GameAreaComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'lightsaber';
}
