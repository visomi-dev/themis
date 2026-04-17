import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

type Locale = 'en' | 'es';

const APP_BASE_URL = '/app';

@Component({
  host: {
    class: /* tw */ 'contents',
  },
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  currentLocale() {
    return this.document.documentElement.lang.startsWith('es') ? 'es' : 'en';
  }

  localeUrl(locale: Locale) {
    const routePath = this.router.url === '/' ? '' : this.router.url;

    return locale === 'es' ? `${APP_BASE_URL}/es${routePath}` : `${APP_BASE_URL}${routePath}`;
  }

  localeLabel(locale: Locale) {
    return locale === 'es'
      ? $localize`:@@languageSwitcherSpanish:Switch to Spanish`
      : $localize`:@@languageSwitcherEnglish:Switch to English`;
  }
}
