import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { reviewResultSchema, type ReviewResult } from '../protocols/review-result.js';
import { pathExists } from '../utils/fs.js';
import { getRunDirectory, writeJson, writeText } from '../workflow/step-store.js';

export function getReviewResultPath(stepId: string, runId: string): string {
  return path.join(getRunDirectory(stepId, runId), 'review.json');
}

export function getReviewSummaryPath(stepId: string, runId: string): string {
  return path.join(getRunDirectory(stepId, runId), 'review-summary.md');
}

export async function runExists(stepId: string, runId: string): Promise<boolean> {
  return pathExists(getRunDirectory(stepId, runId));
}

export async function writeReviewResult(review: ReviewResult): Promise<string> {
  const targetPath = getReviewResultPath(review.stepId, review.runId);
  await writeJson(targetPath, review);
  return targetPath;
}

export async function writeReviewSummary(review: ReviewResult, content: string): Promise<string> {
  const targetPath = getReviewSummaryPath(review.stepId, review.runId);
  await writeText(targetPath, content);
  return targetPath;
}

export async function readReviewResult(stepId: string, runId: string): Promise<ReviewResult | undefined> {
  const targetPath = getReviewResultPath(stepId, runId);
  if (!(await pathExists(targetPath))) return undefined;

  const source = await readFile(targetPath, 'utf8');
  return reviewResultSchema.parse(JSON.parse(source));
}

export async function readReviewSummary(stepId: string, runId: string): Promise<string | undefined> {
  const targetPath = getReviewSummaryPath(stepId, runId);
  if (!(await pathExists(targetPath))) return undefined;
  return readFile(targetPath, 'utf8');
}
