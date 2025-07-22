import fs from 'fs';
import path from 'path';

const tokenPath = path.resolve(__dirname, '../data/youtube_token.json');

import { Credentials } from 'google-auth-library';

export function saveToken(token: Credentials | null) {
  if (!fs.existsSync(tokenPath) || !token) {
    fs.writeFileSync(tokenPath, JSON.stringify({}, null, 2), 'utf-8')
  }
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2), 'utf-8');
}


export function loadToken(): Credentials | null {
  if (fs.existsSync(tokenPath)) {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  }
  return null;
}
export function clearToken() {
  fs.unlinkSync(tokenPath);
}