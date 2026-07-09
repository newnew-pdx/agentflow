import { readFile } from 'node:fs/promises';
import { extractJsonBlockCandidates } from './json-block-extractor.js';
import { scoreAgentFlowCandidate } from './candidate-detector.js';

export type ParsedCandidate = {
  value: unknown;
  source: string;
};

export type ParseResult =
  | { ok: true; candidate: ParsedCandidate; candidates: ParsedCandidate[] }
  | { ok: false; message: string };

export type ReadJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

export async function parseCandidateFile(filePath: string): Promise<ParseResult> {
  let source: string;
  try {
    source = await readFile(filePath, 'utf8');
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, message: `Candidate file read failed: ${reason}` };
  }

  const candidates: ParsedCandidate[] = [];
  const whole = parseJson(source);
  if (whole.ok) {
    candidates.push({ value: whole.value, source: 'whole-file-json' });
  }

  const blocks = extractJsonBlockCandidates(source);
  blocks.forEach((block, index) => {
    const parsed = parseJson(block);
    if (parsed.ok) {
      candidates.push({ value: parsed.value, source: `code-block-${index + 1}` });
    }
  });

  if (candidates.length === 0) {
    return { ok: false, message: 'No valid JSON object was found in the candidate file.' };
  }

  const sorted = [...candidates].sort((left, right) => scoreAgentFlowCandidate(right.value) - scoreAgentFlowCandidate(left.value));
  return { ok: true, candidate: sorted[0]!, candidates: sorted };
}

export async function readJsonCandidateFile(filePath: string, label: string): Promise<ReadJsonResult> {
  let source: string;
  try {
    source = await readFile(filePath, 'utf8');
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, message: `${label} read failed: ${reason}` };
  }

  const parsed = parseJson(source);
  if (!parsed.ok) {
    return { ok: false, message: `${label} JSON parse failed: ${parsed.message}` };
  }

  return { ok: true, value: parsed.value };
}

function parseJson(source: string): ReadJsonResult {
  try {
    return { ok: true, value: JSON.parse(source) };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown parse error';
    return { ok: false, message: reason };
  }
}
