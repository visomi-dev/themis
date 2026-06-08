import { Component } from '@angular/core';

import { Layout } from './shared/layout/layout';
import { ThemeInit } from './shared/layout/theme-init/theme-init';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [Layout, ThemeInit],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
