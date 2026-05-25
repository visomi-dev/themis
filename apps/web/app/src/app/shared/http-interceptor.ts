import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, REQUEST, inject } from '@angular/core';

import { environment } from '../../environments/environment';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const request = inject(REQUEST, { optional: true });

  if (isPlatformServer(platformId)) {
    let apiBase: string = environment.internalApiUrl;

    if (request) {
      const reqObj = request as unknown as Record<string, unknown>;

      if (typeof reqObj['url'] === 'string' && reqObj['url'].startsWith('http')) {
        try {
          apiBase = new URL(reqObj['url']).origin;
        } catch (_error) {
          // Ignore invalid URL parsing
        }
      } else {
        const protocol = (reqObj['protocol'] as string | undefined) ?? 'http';
        const headers = (reqObj['headers'] as Record<string, unknown> | undefined) ?? {};
        const host = (headers['host'] as string | undefined) ?? 'localhost:8080';

        apiBase = `${protocol}://${host}`;
      }
    }

    const localReq = req.clone({
      url: `${apiBase}${req.url}`,
      headers: req.headers.set('cookie', request?.headers.get('cookie') ?? ''),
    });

    return next(localReq);
  }

  return next(req);
};
