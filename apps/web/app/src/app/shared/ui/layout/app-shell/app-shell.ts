import { booleanAttribute, Component, input, output } from '@angular/core';

@Component({
  host: { class: /* tw */ 'block min-h-full bg-bg text-fg' },
  selector: 'app-app-shell',
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  readonly mobileMenuOpen = input(false, { transform: booleanAttribute });
  readonly mobileMenuClose = output<void>();
}
