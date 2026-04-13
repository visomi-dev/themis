import axios from 'axios';

module.exports = async function () {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = process.env.PORT ?? '8080';
  axios.defaults.baseURL = `http://${host}:${port}`;
};
