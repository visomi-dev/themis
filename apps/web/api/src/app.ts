import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.send({ message: 'Hello Themis API' });
});

app.get('/health', (_req, res) => {
  res.send({ status: 'ok' });
});

export { app };
