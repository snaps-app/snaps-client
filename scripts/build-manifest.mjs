import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const repoSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]); }
const files = walk('dist').filter(path => !path.endsWith('manifest.json')).sort().map(path => {
  const bytes = readFileSync(path);
  if (/DATABASE_URL|tzcuhimetnxurvpysybf\.supabase\.co/.test(bytes.toString('utf8'))) throw new Error(`Forbidden backend configuration in ${path}`);
  return { path: relative('dist', path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
writeFileSync('dist/manifest.json', JSON.stringify({ repository: 'snaps-app/snaps-client', version, repo_sha: repoSha, source_sha: process.env.SNAPS_SOURCE_SHA || repoSha, files }, null, 2) + '\n');
console.log(`Manifest ${version}: ${files.length} files; repo SHA ${repoSha}; no backend configuration found.`);
