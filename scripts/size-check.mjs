import { execSync } from 'node:child_process';

try {
  const output = execSync('git diff --cached --numstat', { encoding: 'utf8' });
  const violations = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [added, removed, file] = line.split('\t');
      let addedNum = Number(added);
      let removedNum = Number(removed);
      if (!Number.isFinite(addedNum)) addedNum = 0;
      if (!Number.isFinite(removedNum)) removedNum = 0;
      return { file, size: addedNum + removedNum };
    })
    .filter((entry) => entry.size > 500 * 1024);
  if (violations.length > 0) {
    console.error('Files exceeding 500 KB diff detected:', violations);
    process.exit(1);
  }
} catch (error) {
  if ((error)?.status) {
    process.exit(error.status);
  }
  throw error;
}
