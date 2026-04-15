import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { appRoutes } from './app.routes';
import { ThemisPreset } from './app.theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
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
