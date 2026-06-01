import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, effect, inject, Injectable, signal } from '@angular/core';

import { THEME_KEY } from './constants/storage';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class Settings {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly $theme = signal<Theme>(this.getInitialTheme());

  readonly isDark = computed(() => this.$theme() === 'dark');
  readonly theme = this.$theme.asReadonly();

  setTheme(theme: Theme) {
    this.$theme.set(theme);
  }

  toggleTheme() {
    this.setTheme(this.$theme() === 'dark' ? 'light' : 'dark');
  }

  readonly persistThemeEffect = effect(() => {
    const theme = this.$theme();

    this.document.documentElement.classList.toggle('dark', theme === 'dark');

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.localStorage.setItem(THEME_KEY, theme);
  });

  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    const savedTheme = window.localStorage.getItem(THEME_KEY);

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    if (typeof window.matchMedia !== 'function') {
      return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
