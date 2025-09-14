import { execSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';

const MAX_BYTES = 500 * 1024;

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const large = files.filter((f) => existsSync(f) && statSync(f).size > MAX_BYTES);

if (large.length) {
  console.error('Files exceed 500 KB:\n' + large.join('\n'));
  process.exit(1);
}
