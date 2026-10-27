// Compiles the TypeScript tests with esbuild and runs them with node's test runner.
import * as esbuild from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = join(root, '.test-build');
rmSync(outdir, { recursive: true, force: true });
const entries = readdirSync(join(root, 'tests')).filter((f) => f.endsWith('.test.ts')).map((f) => join(root, 'tests', f));
await esbuild.build({ entryPoints: entries, bundle: true, platform: 'node', format: 'esm', outdir, outExtension: { '.js': '.mjs' }, logLevel: 'warning' });
const files = readdirSync(outdir).map((f) => join(outdir, f));
const res = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(res.status ?? 1);
