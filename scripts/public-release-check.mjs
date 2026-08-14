import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });

const walk = (directory, output = []) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (['.git', 'art-source', '__pycache__'].includes(entry.name) || relative === 'release/builds') continue;
      walk(absolute, output);
    } else if (!/^(tmp_.*\.log|.*_(?:stdout|stderr)\.log)$/.test(entry.name)) {
      output.push(relative);
    }
  }
  return output;
};

const files = git.status === 0 ? git.stdout.split('\0').filter(Boolean) : walk(root);
const checks = [];
const check = (name, ok, evidence) => checks.push({ name, ok: Boolean(ok), evidence });
const required = [
  'README.md', 'README_LOCAL.txt', 'LICENSE', 'SECURITY.md', 'run_local.bat',
  'run_local.sh', 'serve_local.ps1', 'index.html', 'docs/PRESS_KIT.md',
  'docs/promo/THREADS_KO.md', 'docs/promo/THREADS_CAMPAIGN_KO.md', 'docs/promo/PROVENANCE.md',
  'docs/promo/tidal-racer-launch-key-art.png', 'assets/THIRD_PARTY_NOTICES.md',
  'vendor/three/LICENSE',
];

const missing = required.filter(file => !files.includes(file) || !fs.existsSync(path.join(root, file)));
check('public release files', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${required.length} required files`);

const forbidden = files.filter(file =>
  file.startsWith('release/builds/') || file.startsWith('art-source/') ||
  /(^|\/)(__pycache__|_git_publish)(\/|$)/.test(file) ||
  /(^tmp_.*\.log|.*_(?:stdout|stderr)\.log)$/.test(path.basename(file))
);
check('no generated or authoring files', forbidden.length === 0, forbidden.length ? forbidden.slice(0, 8).join(', ') : 'clean');

const fileStats = files.filter(file => fs.existsSync(path.join(root, file))).map(file => ({ file, bytes: fs.statSync(path.join(root, file)).size }));
const oversized = fileStats.filter(item => item.bytes >= 95 * 1024 * 1024);
const totalBytes = fileStats.reduce((sum, item) => sum + item.bytes, 0);
check('GitHub file size', oversized.length === 0, oversized.length ? oversized.map(item => item.file).join(', ') : 'all publishable files < 95 MiB');
check('lean clone', totalBytes < 140 * 1024 * 1024, `${(totalBytes / 1048576).toFixed(2)} MiB publishable`);

const textExtensions = new Set(['', '.bat', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ps1', '.py', '.sh', '.txt', '.yml', '.yaml']);
const candidates = fileStats.filter(item => item.bytes < 5 * 1024 * 1024 && textExtensions.has(path.extname(item.file).toLowerCase()));
const patterns = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['OpenAI-style key', /sk-[A-Za-z0-9_-]{20,}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['assigned secret', /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i],
  ['local user path', /(?:[A-Z]:\\Users\\[^\\\s]+\\(?:AppData|Desktop|Documents)|\/Users\/[^/\s]+\/(?:Library|Desktop)|\/home\/[^/\s]+\/)/],
];
const findings = [];
for (const item of candidates) {
  const source = fs.readFileSync(path.join(root, item.file), 'utf8');
  for (const [label, pattern] of patterns) if (pattern.test(source)) findings.push(`${label}: ${item.file}`);
}
check('credential and personal-path scan', findings.length === 0, findings.length ? findings.slice(0, 10).join(', ') : `${candidates.length} text files scanned`);

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
check('clone instructions', readme.includes('git clone https://github.com/beerAndNacho/') && readme.includes('.\\run_local.bat'), 'Windows clone and launch path');
check('honest release wording', readme.includes('free public preview') && readme.includes('not a claimed AAA'), 'preview limitations disclosed');
const press = fs.readFileSync(path.join(root, 'docs/PRESS_KIT.md'), 'utf8');
const campaign = fs.readFileSync(path.join(root, 'docs/promo/THREADS_CAMPAIGN_KO.md'), 'utf8');
check('current press facts', press.includes('9 enterable city facilities') && press.includes('3-stop Coast Shuttle') && press.includes('10 parked curbside vehicles'), 'current verifiable city and traffic facts');
check('honest Threads campaign', campaign.includes('홍보용 일러스트') && campaign.includes('실제 화면 녹화') && campaign.includes('성공을 보장하지 않는다'), 'seven-day campaign separates illustration, footage, and measurable outcomes');

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('share metadata', index.includes('og:title') && index.includes('og:image') && index.includes('Race, Fish, Explore'), 'Open Graph title/image/description');

let failures = 0;
for (const result of checks) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name} — ${result.evidence}`);
  if (!result.ok) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} public release checks PASS`);
process.exit(failures ? 1 : 0);
