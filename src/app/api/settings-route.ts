// ============================================================
// API: /api/settings — Read and update brand configuration
// Connects the Settings page to Supabase brand_config table
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/settings
 * Fetch the current brand configuration from Supabase
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: config, error } = await supabase
      .from('brand_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !config) {
      // Return defaults if no config exists yet
      return NextResponse.json({
        config: {
          name: 'Your Brand',
          niche_hashtags: [
            'spearfishing', 'spearo', 'freediving', 'spearfishingaustralia',
            'australianspearfishing', 'catchandcook',
          ],
          keywords: ['spearfishing', 'freediving', 'ocean', 'diving', 'australia'],
          target_follower_min: 1000,
          target_follower_max: 500000,
          target_engagement_min: 2.0,
          outreach_message_template: '',
          scoring_weights: {
            content_quality: 0.25,
            engagement: 0.25,
            audience_size: 0.15,
            reels_focus: 0.20,
            brand_fit: 0.15,
          },
        },
        is_default: true,
      });
    }

    return NextResponse.json({ config, is_default: false });
  } catch (error) {
    console.error('[Settings] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load settings.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Create or update the brand configuration in Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Check if a config already exists
    const { data: existing } = await supabase
      .from('brand_config')
      .select('id')
      .limit(1)
      .single();

    const configData = {
      name: body.name ?? 'Your Brand',
      niche_hashtags: body.niche_hashtags ?? [],
      keywords: body.keywords ?? [],
      target_follower_min: body.target_follower_min ?? 1000,
      target_follower_max: body.target_follower_max ?? 500000,
      target_engagement_min: body.target_engagement_min ?? 2.0,
      outreach_message_template: body.outreach_message_template ?? '',
      scoring_weights: body.scoring_weights ?? {
        content_quality: 0.25,
        engagement: 0.25,
        audience_size: 0.15,
        reels_focus: 0.20,
        brand_fit: 0.15,
      },
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing config
      const { error } = await supabase
        .from('brand_config')
        .update(configData)
        .eq('id', existing.id);

      if (error) {
        console.error('[Settings] Update error:', error);
        return NextResponse.json(
          { error: 'Failed to update settings.' },
          { status: 500 }
        );
      }
    } else {
      // Insert new config
      const { error } = await supabase
        .from('brand_config')
        .insert(configData);

      if (error) {
        console.error('[Settings] Insert error:', error);
        return NextResponse.json(
          { error: 'Failed to save settings.' },
          { status: 500 }
        );
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'settings_updated',
      details: configData,
    });

    return NextResponse.json({ success: true, message: 'Settings saved!' });
  } catch (error) {
    console.error('[Settings] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings.' },
      { status: 500 }
    );
  }
}
