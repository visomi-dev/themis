import { pathToFileURL } from 'node:url';

import { app } from './app.js';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const isMainModule = () => {
  const entryFile = process.argv[1];

  if (!entryFile) {
    return false;
  }

  return import.meta.url === pathToFileURL(entryFile).href;
};

if (isMainModule()) {
  app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });
}

export { app };
