import { CONFIG } from '../config';

/**
 * URL for a GitHub issue form in `.github/ISSUE_TEMPLATE/`.
 * Used by the community listing and hotspot suggestion calls to action.
 */
export function issueTemplateUrl(template: string): string {
  return `${CONFIG.githubUrl}/issues/new?template=${encodeURIComponent(template)}`;
}
