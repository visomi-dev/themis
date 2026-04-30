import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay, withI18nSupport } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { appRoutes } from './app.routes';
import { ThemisPreset } from './app.theme';
import { Auth } from './shared/auth/auth';
import { Settings } from './shared/settings';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideClientHydration(withI18nSupport(), withEventReplay()),
    providePrimeNG({
      ripple: false,
      theme: {
        options: {
          darkModeSelector: '.dark',
        },
        preset: ThemisPreset,
      },
    }),
    provideRouter(appRoutes),
    provideAppInitializer(() => inject(Auth).ensureSessionLoaded()),

    Auth,
    Settings,
  ],
};
