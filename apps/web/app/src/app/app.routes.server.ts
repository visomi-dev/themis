import type { ServerRoute } from '@angular/ssr';
import { RenderMode } from '@angular/ssr';

import { PROJECTS_PATH } from './shared/constants/routes';

export const serverRoutes: ServerRoute[] = [
  {
    path: `${PROJECTS_PATH}/:projectId`,
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
