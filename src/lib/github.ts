import { CONFIG } from '../config';

/**
 * URL for a GitHub issue form in `.github/ISSUE_TEMPLATE/`.
 * Used by the community listing and hotspot suggestion calls to action.
 */
export function issueTemplateUrl(template: string, prefill: Record<string, string> = {}): string {
  const q = new URLSearchParams({ template, ...prefill });
  // GitHub fills issue-form fields whose id matches a query parameter.
  return `${CONFIG.githubUrl}/issues/new?${q.toString()}`;
}
