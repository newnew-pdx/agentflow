import path from 'node:path';

const sensitiveFileNames = new Set(['.env', 'id_rsa', 'id_ed25519']);
const sensitiveExtensions = new Set(['.pem', '.key', '.p12', '.jks']);
const sensitiveDirectories = new Set(['node_modules', 'dist', 'target', '.git']);

export const sensitiveFilterRules = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.jks',
  'id_rsa',
  'id_ed25519',
  'node_modules/',
  'dist/',
  'target/',
  '.git/',
  '.agent/generated/',
] as const;

export function isSensitivePath(targetPath: string): boolean {
  const normalized = targetPath.replaceAll('\\', '/');
  const parts = normalized.split('/').filter(Boolean);
  const fileName = parts.at(-1) ?? '';

  if (parts.includes('.agent') && parts.includes('generated')) {
    return true;
  }

  if (parts.some((part) => sensitiveDirectories.has(part))) {
    return true;
  }

  if (sensitiveFileNames.has(fileName)) {
    return true;
  }

  if (fileName.startsWith('.env.')) {
    return true;
  }

  return sensitiveExtensions.has(path.extname(fileName));
}
