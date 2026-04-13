import { Component } from '@angular/core';

@Component({
  host: {
    class: 'app-shell',
  },
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
