import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

type Locale = 'en' | 'es';

const APP_BASE_URL = '/app';

const ENGLISH_LOCALE_SEGMENT = 'en';

@Component({
  host: {
    class: /* tw */ 'contents',
  },
  imports: [MenuModule],
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

    return locale === 'es' ? `${APP_BASE_URL}/es${routePath}` : `${APP_BASE_URL}/${ENGLISH_LOCALE_SEGMENT}${routePath}`;
  }

  localeLabel(locale: Locale) {
    return locale === 'es'
      ? $localize`:@@languageSwitcherSpanish:Switch to Spanish`
      : $localize`:@@languageSwitcherEnglish:Switch to English`;
  }

  currentLocaleLabel() {
    return this.currentLocale().toUpperCase();
  }

  localeItems(): MenuItem[] {
    return [
      {
        label: $localize`:@@languageSwitcherEnglishOption:English`,
        url: this.localeUrl('en'),
      },
      {
        label: $localize`:@@languageSwitcherSpanishOption:Spanish`,
        url: this.localeUrl('es'),
      },
    ];
  }
}
