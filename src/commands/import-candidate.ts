import path from 'node:path';
import {
  detectCandidateType,
  parseExecutionResultCandidate,
  parseReviewResultCandidate,
} from '../candidate/candidate-detector.js';
import { importExecutionResultData, importReviewResultData } from '../candidate/candidate-importer.js';
import { parseCandidateFile } from '../candidate/candidate-parser.js';

export async function importCandidateCommand(file: string): Promise<void> {
  const parsed = await parseCandidateFile(path.resolve(file));
  if (!parsed.ok) {
    console.error('Candidate import failed.');
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  const type = detectCandidateType(parsed.candidate.value);

  if (type === 'ExecutionResult') {
    await importExecutionCandidate(parsed.candidate.value);
    return;
  }

  if (type === 'ReviewResult') {
    await importReviewCandidate(parsed.candidate.value);
    return;
  }

  if (type === 'TaskPacket') {
    console.log('Candidate detected.');
    console.log('Type: TaskPacket candidate');
    console.log('当前 Step12 只自动导入 ExecutionResult 和 ReviewResult。');
    console.log('请使用：');
    console.log(`npm run dev -- import-web-plan ${file}`);
    console.log('或等待后续 task candidate import 能力。');
    return;
  }

  console.error('Candidate import failed.');
  console.error('无法识别为 AgentFlow 协议候选。');
  console.error('请确认 JSON 至少包含 ExecutionResult 的 status/filesChanged，或 ReviewResult 的 verdict/findings。');
  process.exitCode = 1;
}

async function importExecutionCandidate(value: unknown): Promise<void> {
  const result = parseExecutionResultCandidate(value);
  if (!result.ok) {
    printValidationFailure('ExecutionResult', result.issues);
    process.exitCode = 1;
    return;
  }

  const imported = await importExecutionResultData(result.data);
  if (!imported.ok) {
    console.error('Candidate import failed.');
    console.error(imported.message);
    process.exitCode = 1;
    return;
  }

  if (imported.warning) console.warn(imported.warning);

  console.log('Candidate imported.');
  console.log('Type: ExecutionResult');
  console.log(`Step: ${result.data.stepId}`);
  console.log(`Run: ${result.data.runId}`);
  console.log(`Saved: ${toRelativePath(imported.savedPath)}`);
  console.log();
  console.log('Next:');
  console.log(`npm run dev -- verify ${result.data.stepId}`);
  console.log(`npm run dev -- git-check ${result.data.stepId}`);
}

async function importReviewCandidate(value: unknown): Promise<void> {
  const result = parseReviewResultCandidate(value);
  if (!result.ok) {
    printValidationFailure('ReviewResult', result.issues);
    process.exitCode = 1;
    return;
  }

  const imported = await importReviewResultData(result.data);
  if (!imported.ok) {
    console.error('Candidate import failed.');
    console.error(imported.message);
    process.exitCode = 1;
    return;
  }

  if (imported.warning) console.warn(imported.warning);

  console.log('Candidate imported.');
  console.log('Type: ReviewResult');
  console.log(`Step: ${result.data.stepId}`);
  console.log(`Run: ${result.data.runId}`);
  console.log(`Verdict: ${result.data.verdict}`);
  console.log(`Saved: ${toRelativePath(imported.savedPath)}`);
  if (imported.summaryPath) {
    console.log(`Summary: ${toRelativePath(imported.summaryPath)}`);
  }
  console.log();
  console.log('Next:');
  console.log(`npm run dev -- show-review ${result.data.stepId}`);
  if (result.data.verdict === 'changes_required') {
    console.log(`npm run dev -- create-fix ${result.data.stepId}`);
  } else if (result.data.verdict === 'replan_required') {
    console.log(`npm run dev -- create-replan ${result.data.stepId}`);
  } else if (result.data.verdict === 'approved') {
    console.log(`npm run dev -- checkpoint ${result.data.stepId}`);
  } else {
    console.log(`npm run dev -- next-action ${result.data.stepId}`);
  }
}

function printValidationFailure(type: string, issues: { path: string; message: string }[]): void {
  console.error('Candidate import failed.');
  console.error(`${type} validation failed.`);
  for (const issue of issues) {
    console.error(`- ${issue.path}: ${issue.message}`);
  }
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
