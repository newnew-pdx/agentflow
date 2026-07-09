import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { readExecutorConfig } from '../executors/executor-config.js';
import { assertInitialized } from '../workflow/step-store.js';

export async function checkExecutorCommand(executorName: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  if (executorName !== 'codex') {
    console.error(`Unsupported executor check: ${executorName}`);
    console.error('Supported executor checks: codex');
    process.exitCode = 1;
    return;
  }

  const config = await readExecutorConfig();
  const resolved = await resolveCommand(config.codex.command);

  console.log('Executor Check');
  console.log();
  console.log(`Executor: codex`);
  console.log(`Command: ${config.codex.command}`);
  console.log(`Args: ${config.codex.args.length > 0 ? config.codex.args.join(' ') : '(none)'}`);
  console.log(`PromptMode: ${config.codex.promptMode}`);
  console.log(`TimeoutMs: ${config.codex.timeoutMs}`);
  console.log(`MaxOutputChars: ${config.codex.maxOutputChars}`);
  console.log(`Command found: ${resolved.found ? 'yes' : 'no'}`);
  if (resolved.path) {
    console.log(`Resolved path: ${resolved.path}`);
  }
  const encodingStatus = getWindowsEncodingStatus(config.codex.command, config.codex.args);
  if (encodingStatus) {
    console.log(encodingStatus);
  }
  if (config.codex.promptMode === 'stdin') {
    console.log(
      'Encoding note: promptMode=stdin sends the full execution request through stdin. For Chinese UTF-8 prompts on Windows, prefer promptMode=file-reference.',
    );
  }

  console.log();
  console.log('Next suggested command:');
  console.log('npm run dev -- run-executor S001 --executor codex --confirm');

  if (!resolved.found) {
    console.log();
    console.log('Configure .agent/config.yaml:');
    console.log(`executors:
  codex:
    command: "codex"
    args: []
    timeoutMs: 600000
    maxOutputChars: 50000`);
    console.log();
    console.log('On Windows, you can also inspect the command with:');
    console.log('where codex');
    process.exitCode = 1;
  }
}

type ResolveResult = {
  found: boolean;
  path?: string;
};

async function resolveCommand(command: string): Promise<ResolveResult> {
  if (command.includes('/') || command.includes('\\') || path.isAbsolute(command)) {
    try {
      await access(command);
      return { found: true, path: command };
    } catch {
      return { found: false };
    }
  }

  const lookupCommand = process.platform === 'win32' ? 'where.exe' : 'command';
  const lookupArgs = process.platform === 'win32' ? [command] : ['-v', command];
  const lookupOptions = process.platform === 'win32' ? { shell: false } : { shell: true };

  return new Promise((resolve) => {
    const child = spawn(lookupCommand, lookupArgs, {
      ...lookupOptions,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.on('error', () => resolve({ found: false }));
    child.on('close', (code) => {
      const firstLine = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
      resolve({ found: code === 0, path: firstLine });
    });
  });
}

function getWindowsEncodingStatus(command: string, args: string[]): string | undefined {
  const values = [command, ...args].map((value) => value.toLowerCase());
  const commandBaseName = path.basename(command).toLowerCase();
  const usesPowerShell = commandBaseName === 'powershell.exe' || commandBaseName === 'powershell';
  const usesCodexPs1 = values.some((value) => value.includes('codex.ps1'));
  if (usesPowerShell && usesCodexPs1) {
    return 'Warning: PowerShell codex.ps1 wrapper may corrupt UTF-8 Chinese text on Windows. Prefer cmd.exe /c codex.cmd with promptMode=file-reference.';
  }

  const commandExtension = path.extname(command).toLowerCase();
  if (commandExtension === '.cmd') {
    return 'Warning: Directly spawning .cmd from Node may fail with spawn EINVAL on Windows. Prefer command: cmd.exe with args: /d /s /c "...codex.cmd exec ... -"';
  }

  const usesCodexCmd = values.some((value) => value.includes('codex.cmd'));
  if (usesCodexCmd) {
    return 'Encoding: preferred Windows cmd wrapper';
  }

  return undefined;
}
