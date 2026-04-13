import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  host: {
    class: 'app-shell',
  },
  imports: [RouterOutlet],
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
