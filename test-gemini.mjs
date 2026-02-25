import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const keyMatch = env.match(/GEMINI_API_KEY=(.+)/);
const keyMatch2 = env.match(/GEMINI_API_KEY_FALLBACK=(.+)/);

async function test(key, name) {
  if (!key) return;
  console.log('Testing', name, key.trim().substring(0, 10));
  try {
    const genAI = new GoogleGenerativeAI(key.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say hello');
    console.log(name, 'Success!');
  } catch (e) {
    console.error(name, 'Error:', e.message);
  }
}

async function run() {
  await test(keyMatch && keyMatch[1], 'Key 1');
  await test(keyMatch2 && keyMatch2[1], 'Key 2');
}
run();
