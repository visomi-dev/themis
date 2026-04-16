import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { appRoutes } from './app.routes';
import { ThemisPreset } from './app.theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
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
  ],
};
