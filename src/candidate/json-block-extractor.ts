export type FencedCodeBlock = {
  language: string;
  content: string;
};

export function extractFencedCodeBlocks(source: string): FencedCodeBlock[] {
  const blocks: FencedCodeBlock[] = [];
  const fencePattern = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;

  for (const match of source.matchAll(fencePattern)) {
    blocks.push({
      language: (match[1] ?? '').trim().toLowerCase(),
      content: (match[2] ?? '').trim(),
    });
  }

  return blocks;
}

export function extractJsonBlockCandidates(source: string): string[] {
  const blocks = extractFencedCodeBlocks(source);
  const jsonBlocks = blocks.filter((block) => block.language === 'json' || block.language.endsWith(' json'));
  const unlabelledBlocks = blocks.filter((block) => block.language === '');

  return [...jsonBlocks, ...unlabelledBlocks].map((block) => block.content);
}
