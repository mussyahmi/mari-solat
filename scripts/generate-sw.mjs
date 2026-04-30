// Generates public/firebase-messaging-sw.js from the template, stamping in the API key.
// Reads NEXT_PUBLIC_FIREBASE_API_KEY from .env or the process environment.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim();
  }
}

loadEnv();

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!apiKey) {
  console.error('generate-sw: NEXT_PUBLIC_FIREBASE_API_KEY is not set');
  process.exit(1);
}

const template = readFileSync(resolve(root, 'public/firebase-messaging-sw.template.js'), 'utf8');
const output = template.replace('__FIREBASE_API_KEY__', apiKey);
writeFileSync(resolve(root, 'public/firebase-messaging-sw.js'), output);
console.log('generate-sw: public/firebase-messaging-sw.js generated');
