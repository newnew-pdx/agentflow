import type { WebPlanCandidate } from './protocol-normalizer.js';

export type WebPlanParseResult = {
  candidate: WebPlanCandidate;
  source: 'json-block' | 'markdown';
};

const sectionAliases: Record<string, keyof WebPlanCandidate> = {
  goal: 'goal',
  background: 'background',
  scope: 'scope',
  'out of scope': 'outOfScope',
  outofscope: 'outOfScope',
  constraints: 'constraints',
  'acceptance commands': 'acceptanceCommands',
  acceptancecommands: 'acceptanceCommands',
  'context files': 'contextFiles',
  contextfiles: 'contextFiles',
};

export function parseWebPlan(source: string): WebPlanParseResult {
  const jsonCandidate = parseJsonCandidate(source);
  if (jsonCandidate) {
    return { candidate: jsonCandidate, source: 'json-block' };
  }

  return { candidate: parseMarkdownCandidate(source), source: 'markdown' };
}

function parseJsonCandidate(source: string): WebPlanCandidate | undefined {
  const blocks = [...source.matchAll(/```(?:json|JSON)?\s*([\s\S]*?)```/g)];
  for (const block of blocks) {
    const body = block[1]?.trim();
    if (!body) continue;

    try {
      const parsed = JSON.parse(body) as unknown;
      if (isObject(parsed) && ('goal' in parsed || 'scope' in parsed)) {
        return parsed as WebPlanCandidate;
      }
    } catch {
      continue;
    }
  }

  try {
    const parsed = JSON.parse(source) as unknown;
    if (isObject(parsed)) return parsed as WebPlanCandidate;
  } catch {
    return undefined;
  }

  return undefined;
}

function parseMarkdownCandidate(source: string): WebPlanCandidate {
  const sections = collectSections(source);
  const candidate: WebPlanCandidate = {};

  for (const [rawTitle, body] of sections) {
    const key = sectionAliases[normalizeTitle(rawTitle)];
    if (!key) continue;

    if (key === 'goal' || key === 'background') {
      candidate[key] = body.trim();
    } else {
      candidate[key] = parseListLikeSection(body);
    }
  }

  if (candidate.requiresApproval === undefined) {
    candidate.requiresApproval = true;
  }

  return candidate;
}

function collectSections(source: string): Map<string, string> {
  const sections = new Map<string, string>();
  const headingPattern = /^#{2,3}\s+(.+?)\s*$/gm;
  const headings = [...source.matchAll(headingPattern)];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const next = headings[index + 1];
    if (!heading) continue;
    if (heading.index === undefined || !heading[1]) continue;

    const bodyStart = heading.index + heading[0].length;
    const bodyEnd = next?.index ?? source.length;
    sections.set(heading[1], source.slice(bodyStart, bodyEnd).trim());
  }

  return sections;
}

function parseListLikeSection(body: string): string[] {
  const bulletItems = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter((line) => line.length > 0 && !line.startsWith('```'));

  if (bulletItems.length > 0) return bulletItems;

  const text = body.trim();
  return text.length > 0 ? [text] : [];
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
