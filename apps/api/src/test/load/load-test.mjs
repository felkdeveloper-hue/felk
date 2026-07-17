#!/usr/bin/env node
/**
 * Autocannon-style concurrent load probe against a RUNNING API.
 *
 * Usage (staging / local with seed data):
 *   node apps/api/src/test/load/load-test.mjs --url http://localhost:4000 --users 500
 *   node apps/api/src/test/load/load-test.mjs --url http://localhost:4000 --users 5000
 *
 * This does NOT spin MongoMemoryServer — point it at an environment sized for
 * 100k products / 1M orders before trusting the numbers for index/cache work.
 */
import http from 'node:http';
import https from 'node:https';
import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const out = { url: 'http://127.0.0.1:4000', users: 500, path: '/api/v1/system/health', durationSec: 10 };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--url') out.url = argv[++i];
    else if (a === '--users') out.users = Number(argv[++i]);
    else if (a === '--path') out.path = argv[++i];
    else if (a === '--duration') out.durationSec = Number(argv[++i]);
  }
  return out;
}

function requestOnce(baseUrl, path) {
  const url = new URL(path, baseUrl);
  const lib = url.protocol === 'https:' ? https : http;
  const started = performance.now();
  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 10_000,
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve({ ok: res.statusCode < 500, status: res.statusCode, ms: performance.now() - started });
        });
      },
    );
    req.on('error', () => resolve({ ok: false, status: 0, ms: performance.now() - started }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: performance.now() - started });
    });
    req.end();
  });
}

async function run() {
  const opts = parseArgs(process.argv);
  console.log(`Load probe → ${opts.url}${opts.path}`);
  console.log(`Concurrent users: ${opts.users} for ~${opts.durationSec}s`);

  const latencies = [];
  let ok = 0;
  let fail = 0;
  const endAt = Date.now() + opts.durationSec * 1000;

  async function worker() {
    while (Date.now() < endAt) {
      const r = await requestOnce(opts.url, opts.path);
      latencies.push(r.ms);
      if (r.ok) ok += 1;
      else fail += 1;
    }
  }

  const started = performance.now();
  await Promise.all(Array.from({ length: opts.users }, () => worker()));
  const elapsedSec = (performance.now() - started) / 1000;

  latencies.sort((a, b) => a - b);
  const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] ?? 0;

  console.log(
    JSON.stringify(
      {
        users: opts.users,
        elapsedSec: Number(elapsedSec.toFixed(2)),
        requests: ok + fail,
        ok,
        fail,
        rps: Number(((ok + fail) / elapsedSec).toFixed(1)),
        p50ms: Number(pct(0.5).toFixed(1)),
        p95ms: Number(pct(0.95).toFixed(1)),
        p99ms: Number(pct(0.99).toFixed(1)),
      },
      null,
      2,
    ),
  );

  if (fail > ok) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
