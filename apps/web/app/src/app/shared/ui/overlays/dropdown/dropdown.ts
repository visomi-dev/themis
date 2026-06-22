import { OverlayModule } from '@angular/cdk/overlay';
import { booleanAttribute, Component, input, output, signal } from '@angular/core';

@Component({
  host: { class: /* tw */ 'relative inline-block' },
  imports: [OverlayModule],
  selector: 'app-dropdown',
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.css',
})
export class Dropdown {
  readonly align = input<'start' | 'end'>('start');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly openChange = output<boolean>();

  readonly open = signal(false);

  toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.setOpen(!this.open());
  }

  setOpen(open: boolean): void {
    this.open.set(open);
    this.openChange.emit(open);
  }

  close(): void {
    this.setOpen(false);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}
