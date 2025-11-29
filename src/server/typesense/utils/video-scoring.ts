/**
 * Utilities for calculating video scores for discovery features
 */

/**
 * Calculate popularity score based on total engagement
 * Formula: (views * 1) + (likes * 10) - (dislikes * 5)
 */
export function calculatePopularityScore(
  views: number = 0,
  likes: number = 0,
  dislikes: number = 0,
): number {
  return views + likes * 10 - dislikes * 5;
}

/**
 * Calculate trending score with time decay
 * Emphasizes recent engagement over older engagement
 *
 * Formula:
 *   - Recent activity (24h) has 10x weight
 *   - Weekly activity (7d) has 5x weight
 *   - Total activity has 1x weight
 *   - Apply time decay based on video age
 */
export function calculateTrendingScore(
  viewsLast24h: number = 0,
  viewsLast7d: number = 0,
  viewsTotal: number = 0,
  likesLast24h: number = 0,
  likesLast7d: number = 0,
  likesTotal: number = 0,
  createdAt: Date,
): number {
  const now = Date.now();
  const ageInDays = (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Time decay: newer videos get boost, but not too aggressive
  // Videos older than 30 days get reduced trending potential
  const timeDecay = Math.max(0.1, 1 - ageInDays / 30);

  const recentEngagement = viewsLast24h * 10 + likesLast24h * 50;
  const weeklyEngagement = viewsLast7d * 5 + likesLast7d * 25;
  const totalEngagement = viewsTotal + likesTotal * 10;

  return (
    (recentEngagement + weeklyEngagement + totalEngagement * 0.1) * timeDecay
  );
}

/**
 * Calculate engagement rate (quality metric)
 * Higher rate = more engaging content
 */
export function calculateEngagementRate(
  likes: number = 0,
  views: number = 0,
): number {
  if (views === 0) return 0;
  return likes / views;
}

/**
 * Example: Update video scores (run periodically via cron job)
 */
export async function updateVideoScores(metrics: {
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  viewsLast24h: number;
  viewsLast7d: number;
  likesLast24h: number;
  likesLast7d: number;
  createdAt: Date;
}) {
  const popularityScore = calculatePopularityScore(
    metrics.viewCount,
    metrics.likeCount,
    metrics.dislikeCount,
  );

  const trendingScore = calculateTrendingScore(
    metrics.viewsLast24h,
    metrics.viewsLast7d,
    metrics.viewCount,
    metrics.likesLast24h,
    metrics.likesLast7d,
    metrics.likeCount,
    metrics.createdAt,
  );

  const engagementRate = calculateEngagementRate(
    metrics.likeCount,
    metrics.viewCount,
  );

  return {
    popularity_score: popularityScore,
    trending_score: trendingScore,
    engagement_rate: engagementRate,
  };
}
