import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, REQUEST, inject } from '@angular/core';

import { environment } from '../../environments/environment';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const request = inject(REQUEST, { optional: true });

  if (isPlatformServer(platformId)) {
    const localReq = req.clone({
      url: `${environment.internalApiUrl}${req.url}`,
      headers: req.headers.set('cookie', request?.headers.get('cookie') ?? ''),
    });

    return next(localReq);
  }

  return next(req);
};
