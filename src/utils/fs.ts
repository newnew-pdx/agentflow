import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function createDirectory(targetPath: string): Promise<void> {
  await mkdir(targetPath, { recursive: true });
}

export async function writeFileIfMissing(targetPath: string, content: string): Promise<boolean> {
  await createDirectory(path.dirname(targetPath));

  try {
    await writeFile(targetPath, content, { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'EEXIST') {
      return false;
    }

    throw error;
  }
}

export async function countDirectoryEntries(targetPath: string): Promise<number> {
  try {
    return (await readdir(targetPath)).length;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return 0;
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
