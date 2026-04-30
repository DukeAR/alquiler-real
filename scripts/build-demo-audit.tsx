import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_AUDIT_ROUTES, getDemoAuditManifest, renderDemoAuditRoute } from '../src/demo/auditPages.tsx';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, '..');
const distPath = path.join(projectRootPath, 'dist');
const distIndexPath = path.join(distPath, 'index.html');

const stripClientScripts = (template: string) => template
  .replace(/<script\s+type="module"[\s\S]*?<\/script>/g, '')
  .replace(/<link\s+rel="modulepreload"[^>]*>/g, '');

const injectAuditMarkup = (template: string, markup: string, title: string) => {
  const withTitle = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

  return withTitle.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${markup}</div>`);
};

const writeAuditRoute = async (template: string, route: (typeof DEMO_AUDIT_ROUTES)[number]) => {
  const markup = renderDemoAuditRoute(route);
  const html = injectAuditMarkup(template, markup, route.title);
  const outputPath = path.join(distPath, route.outputPath);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, 'utf8');
};

const writeAuditManifest = async () => {
  const manifestPath = path.join(distPath, 'demo', 'routes.json');
  const manifestContent = JSON.stringify(getDemoAuditManifest(), null, 2);

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, manifestContent, 'utf8');
};

const main = async () => {
  const template = stripClientScripts(await fs.readFile(distIndexPath, 'utf8'));

  await Promise.all(DEMO_AUDIT_ROUTES.map((route) => writeAuditRoute(template, route)));
  await writeAuditManifest();
};

main().catch((error) => {
  console.error('[build-demo-audit] Failed to generate static demo audit routes.');
  console.error(error);
  process.exitCode = 1;
});