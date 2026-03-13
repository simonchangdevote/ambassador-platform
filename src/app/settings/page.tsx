// ============================================================
// SETTINGS — Configure brand criteria, scoring weights, templates
// Connected to Supabase via /api/settings
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { getTemplateVariables } from '@/lib/message-templates';

export default function SettingsPage() {
  const [brandName, setBrandName] = useState('Your Brand');
  const [hashtags, setHashtags] = useState('');
  const [keywords, setKeywords] = useState('');
  const [minFollowers, setMinFollowers] = useState('1000');
  const [maxFollowers, setMaxFollowers] = useState('500000');
  const [minEngagement, setMinEngagement] = useState('2.0');
  const [messageTemplate, setMessageTemplate] = useState('');

  const [weights, setWeights] = useState({
    content_quality: 25,
    engagement: 25,
    audience_size: 15,
    reels_focus: 20,
    brand_fit: 15,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const templateVars = getTemplateVariables();

  // Load settings from Supabase on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.config) {
          const c = data.config;
          setBrandName(c.name || 'Your Brand');
          setHashtags((c.niche_hashtags || []).join(', '));
          setKeywords((c.keywords || []).join(', '));
          setMinFollowers(String(c.target_follower_min || 1000));
          setMaxFollowers(String(c.target_follower_max || 500000));
          setMinEngagement(String(c.target_engagement_min || 2.0));
          setMessageTemplate(c.outreach_message_template || '');
          if (c.scoring_weights) {
            setWeights({
              content_quality: Math.round((c.scoring_weights.content_quality || 0.25) * 100),
              engagement: Math.round((c.scoring_weights.engagement || 0.25) * 100),
              audience_size: Math.round((c.scoring_weights.audience_size || 0.15) * 100),
              reels_focus: Math.round((c.scoring_weights.reels_focus || 0.20) * 100),
              brand_fit: Math.round((c.scoring_weights.brand_fit || 0.15) * 100),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    if (totalWeight !== 100) {
      setSaveMessage('Scoring weights must add up to 100%. Currently: ' + totalWeight + '%');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName,
          niche_hashtags: hashtags.split(',').map(h => h.trim()).filter(Boolean),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          target_follower_min: parseInt(minFollowers) || 1000,
          target_follower_max: parseInt(maxFollowers) || 500000,
          target_engagement_min: parseFloat(minEngagement) || 2.0,
          outreach_message_template: messageTemplate,
          scoring_weights: {
            content_quality: weights.content_quality / 100,
            engagement: weights.engagement / 100,
            audience_size: weights.audience_size / 100,
            reels_focus: weights.reels_focus / 100,
            brand_fit: weights.brand_fit / 100,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage('Settings saved! Changes will apply to your next scouting run.');
      } else {
        setSaveMessage('Error: ' + (data.error || 'Failed to save settings.'));
      }
    } catch {
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-center py-12">
          <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Configure your scouting criteria, scoring weights, and outreach templates.
          Changes apply to the next scouting run.
        </p>
      </div>

      {/* Brand Info */}
      <Section title="Brand Configuration">
        <Field label="Brand Name" value={brandName} onChange={setBrandName} />
        <Field label="Niche Hashtags (comma-separated)" value={hashtags} onChange={setHashtags}
               hint="Hashtags to search when scouting Instagram. E.g.: spearfishing, spearo, freediving" />
        <Field label="Keywords (comma-separated)" value={keywords} onChange={setKeywords}
               hint="Keywords to match in creator bios for brand fit scoring" />
      </Section>

      {/* Target Criteria */}
      <Section title="Target Creator Criteria">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min Followers" value={minFollowers} onChange={setMinFollowers} type="number" />
          <Field label="Max Followers" value={maxFollowers} onChange={setMaxFollowers} type="number" />
        </div>
        <Field label="Min Engagement Rate (%)" value={minEngagement} onChange={setMinEngagement} type="number" />
        <p className="text-xs text-gray-400 mt-1">
          Current range: {parseInt(minFollowers).toLocaleString()} &ndash; {parseInt(maxFollowers).toLocaleString()} followers
        </p>
      </Section>

      {/* Scoring Weights */}
      <Section title="Scoring Weights">
        <p className="text-sm text-gray-500 mb-4">
          Adjust how much each dimension contributes to the overall Ambassador Score.
          Total must equal 100%.
        </p>
        {Object.entries(weights).map(([key, value]) => (
          <div key={key} className="flex items-center gap-4 mb-3">
            <label className="w-40 text-sm text-gray-700 capitalize">
              {key.replace(/_/g, ' ')}
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={value}
              onChange={(e) => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-right">{value}%</span>
          </div>
        ))}
        <p className={`text-sm font-medium ${totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
          Total: {totalWeight}% {totalWeight !== 100 && '(must equal 100%)'}
        </p>
      </Section>

      {/* Outreach Template */}
      <Section title="Outreach Message Template">
        <p className="text-sm text-gray-500 mb-3">
          Customise the DM message sent to approved creators. Use variables below:
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {templateVars.map(v => (
            <span key={v.key} className="px-2 py-1 bg-brand-50 text-brand-700 text-xs
                                        rounded-md font-mono" title={v.description}>
              {v.key}
            </span>
          ))}
        </div>
        <textarea
          value={messageTemplate}
          onChange={(e) => setMessageTemplate(e.target.value)}
          rows={8}
          placeholder="Hey {{first_name}}! We've been checking out your content and love what you're doing..."
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </Section>

      {/* Save Status */}
      {saveMessage && (
        <div className={`rounded-lg p-3 mb-4 text-sm ${
          saveMessage.includes('saved')
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || totalWeight !== 100}
          className="px-6 py-2.5 bg-brand-600 text-white font-medium rounded-lg
                     hover:bg-brand-700 transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, hint, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
