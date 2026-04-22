#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function startTunnel() {
  // Prefer the ngrok CLI (must be installed and in PATH). If unavailable,
  // fall back to programmatic localtunnel.
  const http = require('http');

  const findNgrokExecutable = () => {
    const candidates = [];
    if (process.platform === 'win32') {
      candidates.push(path.resolve(process.cwd(), 'scripts', 'ngrok.exe'));
      candidates.push(path.resolve(process.cwd(), 'ngrok.exe'));
    } else {
      candidates.push(path.resolve(process.cwd(), 'scripts', 'ngrok'));
      candidates.push(path.resolve(process.cwd(), 'ngrok'));
    }
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    try {
      // Check PATH (Windows: where, Unix: which)
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      const res = spawnSync(whichCmd, ['ngrok'], { shell: true, encoding: 'utf8' });
      if (res.status === 0 && res.stdout) {
        const first = res.stdout.split(/\r?\n/)[0].trim();
        if (first && fs.existsSync(first)) return first;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const downloadNgrok = async () => {
    const scriptsDir = path.resolve(process.cwd(), 'scripts');
    if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

    let zipUrl;
    if (process.platform === 'win32') zipUrl = 'https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip';
    else if (process.platform === 'darwin') zipUrl = 'https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-darwin-amd64.zip';
    else zipUrl = 'https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip';

    const zipPath = path.join(scriptsDir, 'ngrok.zip');

    const download = () => new Promise((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);
      https.get(zipUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow redirect
          https.get(res.headers.location, (r2) => r2.pipe(file).on('finish', () => file.close(resolve)).on('error', reject)).on('error', reject);
          return;
        }
        if (res.statusCode !== 200) return reject(new Error('Failed to download ngrok binary: ' + res.statusCode));
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    });

    try {
      await download();
    } catch (err) {
      throw new Error('Download failed: ' + (err && err.message ? err.message : String(err)));
    }

    // Extract zip (Windows uses PowerShell Expand-Archive)
    try {
      if (process.platform === 'win32') {
        const cmd = 'powershell';
        const args = ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${scriptsDir}' -Force`];
        const res = spawnSync(cmd, args, { stdio: 'inherit' });
        if (res.status !== 0) throw new Error('Failed to extract ngrok zip via PowerShell');
      } else {
        // try unzip or tar
        const res = spawnSync('unzip', [zipPath, '-d', scriptsDir], { stdio: 'inherit' });
        if (res.status !== 0) {
          const res2 = spawnSync('tar', ['-xf', zipPath, '-C', scriptsDir], { stdio: 'inherit' });
          if (res2.status !== 0) throw new Error('Failed to extract ngrok zip (no unzip/tar available)');
        }
      }
    } catch (err) {
      throw err;
    }

    // find extracted binary
    const walk = (dir) => {
      const list = fs.readdirSync(dir);
      for (const f of list) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          const found = walk(full);
          if (found) return found;
        } else if (stat.isFile()) {
          if (process.platform === 'win32' && f.toLowerCase() === 'ngrok.exe') return full;
          if (process.platform !== 'win32' && f === 'ngrok') return full;
        }
      }
      return null;
    };

    const found = walk(scriptsDir);
    if (!found) throw new Error('ngrok binary not found after extracting');
    // ensure executable bit on *nix
    try { if (process.platform !== 'win32') fs.chmodSync(found, 0o755); } catch (e) {}
    return found;
  };

  const ensureNgrok = async () => {
    const existing = findNgrokExecutable();
    if (existing) return existing;
    // Try to download binary into scripts/
    try {
      const downloaded = await downloadNgrok();
      return downloaded;
    } catch (err) {
      // try winget/choco as last resort (best-effort)
      try {
        if (process.platform === 'win32') {
          // try winget
          try {
            spawnSync('winget', ['install', '--id', 'ngrok.ngrok', '-e', '--accept-package-agreements', '--accept-source-agreements'], { stdio: 'inherit', shell: true });
            const again = findNgrokExecutable();
            if (again) return again;
          } catch (e) {}
          // try choco
          try {
            spawnSync('choco', ['install', 'ngrok', '-y'], { stdio: 'inherit', shell: true });
            const again2 = findNgrokExecutable();
            if (again2) return again2;
          } catch (e) {}
        }
      } catch (e) {}
    }
    return null;
  };

  const startNgrokCli = async () => {
    const args = ['http', '3000', '--log', 'stdout'];
    if (process.env.NGROK_AUTHTOKEN) args.push('--authtoken', process.env.NGROK_AUTHTOKEN);
    if (process.env.NGROK_REGION) args.push('--region', process.env.NGROK_REGION);
    if (process.env.NGROK_SUBDOMAIN) args.push('--subdomain', process.env.NGROK_SUBDOMAIN);

    let ngrokProc;
    // Prefer an available ngrok executable (PATH or downloaded), otherwise rely on 'ngrok' in PATH
    const ngrokExec = await ensureNgrok();
    try {
      if (ngrokExec) {
        ngrokProc = spawn(ngrokExec, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
      } else {
        ngrokProc = spawn('ngrok', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
      }
    } catch (err) {
      throw err;
    }

    let ngrokError = null;
    ngrokProc.on('error', (e) => { ngrokError = e; });
    ngrokProc.stderr.on('data', (d) => { process.stderr.write(`[ngrok] ${d}`); });
    ngrokProc.stdout.on('data', (d) => { process.stdout.write(`[ngrok] ${d}`); });

    const getTunnels = () => new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      }).on('error', (err) => reject(err));
    });

    const timeoutMs = Number(process.env.NGROK_START_TIMEOUT_MS || 20000);
    const startAt = Date.now();
    while (Date.now() - startAt < timeoutMs) {
      if (ngrokError) throw ngrokError;
      try {
        const data = await getTunnels();
        if (data && Array.isArray(data.tunnels) && data.tunnels.length > 0) {
          // prefer https tunnel
          const pick = data.tunnels.find(t => t.proto === 'https' || (t.public_url && t.public_url.startsWith('https://'))) || data.tunnels[0];
          const url = pick.public_url;
          return {
            url,
            disconnect: async () => {
              try { ngrokProc.kill(); } catch (e) {}
            }
          };
        }
      } catch (e) {
        // wait and retry
      }
      await new Promise(r => setTimeout(r, 500));
    }

    // timed out
    try { ngrokProc.kill(); } catch (e) {}
    throw new Error('ngrok CLI started but tunnel did not become available in time');
  };

  try {
    return await startNgrokCli();
  } catch (err) {
    console.warn('ngrok CLI start failed, falling back to localtunnel:', err && err.message ? err.message : err);
    try {
      const localtunnel = require('localtunnel');
      const ltOpts = { port: 3000 };
      if (process.env.NGROK_SUBDOMAIN) ltOpts.subdomain = process.env.NGROK_SUBDOMAIN;
      const tunnel = await localtunnel(ltOpts);
      const url = tunnel.url;
      return { url, disconnect: async () => { await tunnel.close(); } };
    } catch (err2) {
      console.error('Failed to start any tunnel (ngrok CLI/localtunnel):', err2);
      throw err2;
    }
  }
}

function spawnProc(cmd, args, envVars = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true, env: { ...process.env, ...envVars } });
  child.on('error', (err) => console.error(`Process ${cmd} error:`, err));
  return child;
}

(async () => {
  console.log('Starting backend (server)...');
  const backend = spawnProc('npm', ['run', 'server']);

  try {
    console.log('Starting tunnel (ngrok/localtunnel) — this may take a few seconds...');
    const tunnel = await startTunnel();
    console.log('Tunnel listening at', tunnel.url);

    const host = tunnel.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log(`Using HMR host: ${host}`);

    const envForFrontend = {
      VITE_REMOTE_HMR: 'true',
      VITE_HMR_HOST: host,
      VITE_HMR_PORT: '443',
      HMR_HOST: host,
      HMR_PORT: '443'
    };

    console.log('Starting frontend (vite) with HMR over public tunnel...');
    const frontend = spawnProc('npm', ['run', 'dev:frontend'], envForFrontend);

    const cleanup = async (code) => {
      try { frontend.kill(); } catch (e) {}
      try { backend.kill(); } catch (e) {}
      try { await tunnel.disconnect(); } catch (e) {}
      process.exit(code || 0);
    };

    process.on('SIGINT', () => cleanup(0));
    process.on('SIGTERM', () => cleanup(0));
    frontend.on('exit', () => cleanup(0));
    backend.on('exit', () => cleanup(0));

  } catch (err) {
    console.error('dev:full failed:', err);
    process.exit(1);
  }
})();
