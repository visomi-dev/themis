import { Component } from '@angular/core';

@Component({
  host: {
    class:
      /* tw */ 'flex items-stretch overflow-hidden rounded-[var(--radius-control)] border border-zinc-500/30 dark:border-zinc-400/30 bg-zinc-50 dark:bg-zinc-900 focus-within:ring-2 focus-within:ring-blue-500/30 [&_[data-slot=control]]:border-0 [&_[data-slot=control]]:bg-transparent [&_[data-slot=control]]:ring-0',
  },
  selector: 'app-input-group',
  templateUrl: './input-group.html',
  styleUrl: './input-group.css',
})
export class InputGroup {}
