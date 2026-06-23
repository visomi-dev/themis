import { Component, output } from '@angular/core';

@Component({
  host: { class: /* tw */ 'block border-b border-outline-variant/40 bg-bg/90 backdrop-blur' },
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  readonly menuClick = output<void>();
}
