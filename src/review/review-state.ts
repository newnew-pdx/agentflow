import type { ReviewResult } from '../protocols/review-result.js';
import type { StepReviewSummary, StepStatus } from '../workflow/step-state.js';

const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const;

export function mapReviewVerdictToStepStatus(verdict: ReviewResult['verdict']): StepStatus {
  return {
    approved: 'REVIEW_APPROVED',
    changes_required: 'CHANGES_REQUIRED',
    replan_required: 'REPLAN_REQUIRED',
    rejected: 'REVIEW_REJECTED',
  }[verdict] as StepStatus;
}

export function getHighestSeverity(findings: ReviewResult['findings']): StepReviewSummary['highestSeverity'] {
  if (findings.length === 0) return null;

  return findings.reduce<NonNullable<StepReviewSummary['highestSeverity']>>((highest, finding) => {
    return severityRank[finding.severity] > severityRank[highest] ? finding.severity : highest;
  }, findings[0]!.severity);
}

export function createStepReviewSummary(review: ReviewResult, reviewedAt: string): StepReviewSummary {
  return {
    verdict: review.verdict,
    reviewedAt,
    findingsCount: review.findings.length,
    highestSeverity: getHighestSeverity(review.findings),
    suggestedNextAction: review.suggestedNextAction,
    summary: review.summary,
  };
}
