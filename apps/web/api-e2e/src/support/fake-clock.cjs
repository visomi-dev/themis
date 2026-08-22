const fs = require('node:fs');

const RealDate = Date;
const clockFile = process.env.PASSKEY_E2E_CLOCK_FILE;

if (clockFile) {
  const now = () => Number(fs.readFileSync(clockFile, 'utf8'));

  global.Date = class TestDate extends RealDate {
    constructor(...args) {
      super(...(args.length === 0 ? [now()] : args));
    }

    static now() {
      return now();
    }
  };
}
