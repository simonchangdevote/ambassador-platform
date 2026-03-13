// ============================================================
// OUTREACH MESSAGE TEMPLATES
// Generates personalised DM text for copy/paste outreach
// ============================================================

import type { Creator } from '@/types';

/** Default brand outreach template */
const DEFAULT_TEMPLATE = `Hey {{first_name}}! We've been checking out your content and love what you're doing.

We're always on the lookout for passionate creators in the ocean/spearfishing/diving space and we'd love to explore working together.

We're particularly looking for creators who enjoy making reels and video content, and we'd be keen to chat about sending you some gear and building a partnership.

Let us know if you'd be interested!`;

/** Personalisation variables available */
interface TemplateVars {
  first_name: string;
  username: string;
  followers: string;
  niche: string;
  brand_name: string;
}

/**
 * Generate a personalised outreach message for a creator
 */
export function generateOutreachMessage(
  creator: Creator,
  brandName: string,
  customTemplate?: string
): string {
  const template = customTemplate || DEFAULT_TEMPLATE;

  // Extract a first name from full_name or use username
  const firstName = creator.full_name
    ? creator.full_name.split(' ')[0]
    : creator.instagram_username;

  // Determine niche from hashtags
  const niche = detectNiche(creator.recent_hashtags ?? []);

  const vars: TemplateVars = {
    first_name: firstName,
    username: creator.instagram_username,
    followers: formatFollowers(creator.followers_count),
    niche,
    brand_name: brandName,
  };

  // Replace template variables
  let message = template;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return message;
}

/** Format follower count (e.g., 15400 → "15.4K") */
function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

/** Detect primary niche from hashtags */
function detectNiche(hashtags: string[]): string {
  const tags = hashtags.map(t => t.toLowerCase());

  const niches: Record<string, string[]> = {
    'spearfishing': ['spearfishing', 'spearo', 'spearfishinglife', 'spearfishingaustralia'],
    'freediving': ['freediving', 'freedive', 'apnea'],
    'diving': ['diving', 'scubadiving', 'scuba'],
    'fishing': ['fishing', 'catchandcook', 'fishinglife'],
    'ocean lifestyle': ['oceanlife', 'beachlife', 'saltlife', 'coastalliving'],
  };

  let bestNiche = 'ocean/adventure';
  let bestCount = 0;

  for (const [niche, keywords] of Object.entries(niches)) {
    const count = keywords.filter(kw => tags.some(t => t.includes(kw))).length;
    if (count > bestCount) {
      bestNiche = niche;
      bestCount = count;
    }
  }

  return bestNiche;
}

/** Get all available template variables with descriptions */
export function getTemplateVariables(): Array<{ key: string; description: string }> {
  return [
    { key: '{{first_name}}', description: 'Creator\'s first name (from profile or username)' },
    { key: '{{username}}', description: 'Instagram username' },
    { key: '{{followers}}', description: 'Formatted follower count (e.g., 15.4K)' },
    { key: '{{niche}}', description: 'Detected content niche' },
    { key: '{{brand_name}}', description: 'Your brand name' },
  ];
}
