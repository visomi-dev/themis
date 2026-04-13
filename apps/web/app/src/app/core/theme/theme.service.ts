import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';

type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly themeState = signal<ThemeMode>(this.getInitialTheme());

  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor() {
    this.applyTheme(this.themeState());
  }

  toggleTheme() {
    const nextTheme = this.themeState() === 'dark' ? 'light' : 'dark';
    this.themeState.set(nextTheme);
    this.applyTheme(nextTheme);
  }

  private applyTheme(theme: ThemeMode) {
    const root = this.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');

    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.setItem('theme', theme);
    }
  }

  private getInitialTheme(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    const savedTheme = window.localStorage.getItem('theme');

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
