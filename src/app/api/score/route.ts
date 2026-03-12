// ============================================================
// API: /api/score — Score or re-score creators
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/score
 * Score a batch of creators
 * Body: { batch_id: string, creator_ids?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_id, creator_ids } = body;

    if (!batch_id) {
      return NextResponse.json(
        { error: 'batch_id is required' },
        { status: 400 }
      );
    }

    // TODO: Implementation:
    // 1. Fetch brand config (weights, hashtags, keywords)
    // 2. Fetch creator profiles from DB
    // 3. Run calculateOverallScore() for each
    // 4. Save scores to creator_scores table
    // 5. Update batch status to 'review'

    return NextResponse.json({
      success: true,
      message: `Scoring complete for batch ${batch_id}`,
      // scored_count: results.length,
    });
  } catch (error) {
    console.error('[Score] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Scoring failed.' },
      { status: 500 }
    );
  }
}
