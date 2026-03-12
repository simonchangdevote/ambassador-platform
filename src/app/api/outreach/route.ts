// ============================================================
// API: /api/outreach — Generate DM message and update status
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/outreach
 * Generate a personalised outreach message for an approved creator
 * Body: { creator_id: string, batch_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creator_id, batch_id } = body;

    // TODO: Implementation:
    // 1. Fetch creator profile from DB
    // 2. Fetch brand config (message template, brand name)
    // 3. Generate personalised message via generateOutreachMessage()
    // 4. Save message to outreach_records.dm_message
    // 5. Update status to 'dm_drafted'

    return NextResponse.json({
      success: true,
      // dm_message: generatedMessage,
    });
  } catch (error) {
    console.error('[Outreach] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Outreach generation failed.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/outreach
 * Update outreach status (mark as sent, replied, etc.)
 * Body: { outreach_id: string, status: string, notes?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { outreach_id, status, notes } = body;

    // TODO: Update outreach_records in Supabase
    // Also log to activity_log table

    return NextResponse.json({
      success: true,
      message: `Outreach ${outreach_id} updated to ${status}`,
    });
  } catch (error) {
    console.error('[Outreach] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Status update failed.' },
      { status: 500 }
    );
  }
}
