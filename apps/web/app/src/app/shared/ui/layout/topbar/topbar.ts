import { Component, output } from '@angular/core';

@Component({
  host: { class: /* tw */ 'block border-b border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-950/90 backdrop-blur' },
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  readonly menuClick = output<void>();
}
