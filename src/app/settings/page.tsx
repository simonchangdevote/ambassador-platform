// ============================================================
// SETTINGS — Search hashtags, filters, outreach template
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { getTemplateVariables } from '@/lib/message-templates';

export default function SettingsPage() {
  const [brandName, setBrandName] = useState('Your Brand');
  const [searchHashtags, setSearchHashtags] = useState('');
  const [locationTags, setLocationTags] = useState('');
  const [minFollowers, setMinFollowers] = useState('500');
  const [maxFollowers, setMaxFollowers] = useState('500000');
  const [minReels, setMinReels] = useState('5');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [costHighProfile, setCostHighProfile] = useState('300');
  const [costBrandAmbassador, setCostBrandAmbassador] = useState('200');
  const [costCommunityAmbassador, setCostCommunityAmbassador] = useState('50');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const templateVars = getTemplateVariables();

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const data = await res.json();
        if (data.config) {
          const c = data.config;
          setBrandName(c.name || 'Your Brand');
          setSearchHashtags((c.niche_hashtags || []).join(', '));
          setLocationTags((c.required_hashtags || []).join(', '));
          setMinFollowers(String(c.target_follower_min || 500));
          setMaxFollowers(String(c.target_follower_max || 500000));
          setMinReels(String(c.min_reels || 5));
          setMessageTemplate(c.outreach_message_template || '');
          setCostHighProfile(String(c.tier_cost_high_profile ?? 300));
          setCostBrandAmbassador(String(c.tier_cost_brand_ambassador ?? 200));
          setCostCommunityAmbassador(String(c.tier_cost_community_ambassador ?? 50));
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
    setIsSaving(true);
    setSaveMessage('');

    const min = parseInt(minFollowers) || 500;
    const max = parseInt(maxFollowers) || 500000;
    if (min >= max) {
      setSaveMessage('Min followers must be less than max followers.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName,
          niche_hashtags: searchHashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
          required_hashtags: locationTags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
          target_follower_min: min,
          target_follower_max: max,
          min_reels: parseInt(minReels) || 5,
          outreach_message_template: messageTemplate,
          tier_cost_high_profile: parseInt(costHighProfile) || 300,
          tier_cost_brand_ambassador: parseInt(costBrandAmbassador) || 200,
          tier_cost_community_ambassador: parseInt(costCommunityAmbassador) || 50,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage('Settings saved! Changes will apply to your next scouting run.');
      } else {
        setSaveMessage('Error: ' + (data.error || 'Failed to save settings.'));
      }
    } catch (err) {
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
          Configure your scouting criteria. Changes apply to the next scouting run.
        </p>
      </div>

      {/* Brand */}
      <Section title="Brand">
        <Field label="Brand Name" value={brandName} onChange={setBrandName}
               hint="Used in outreach messages" />
      </Section>

      {/* Search */}
      <Section title="Instagram Search"
               description="Hashtags the scout uses to find posts. These define what content you're looking for.">
        <Field
          label="Search Hashtags"
          value={searchHashtags}
          onChange={setSearchHashtags}
          hint="Comma-separated, no # needed. E.g.: spearfishing, spearo, freediving, spearfishingaustralia, australianspearfishing"
        />
      </Section>

      {/* Filters */}
      <Section title="Creator Filters"
               description="Every creator must pass ALL of these to become a candidate. The app keeps searching until it finds 10 qualified creators.">
        <Field
          label="Location Tags"
          value={locationTags}
          onChange={setLocationTags}
          hint="Creator must match at least one in their hashtags, bio, or post captions. E.g.: australia, australian, aussie"
        />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Min Followers" value={minFollowers} onChange={setMinFollowers} type="number" />
          <Field label="Max Followers" value={maxFollowers} onChange={setMaxFollowers} type="number" />
          <Field label="Min Reels" value={minReels} onChange={setMinReels} type="number"
                 hint="Minimum reels on profile" />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Range: {parseInt(minFollowers).toLocaleString()} – {parseInt(maxFollowers).toLocaleString()} followers, at least {minReels} reels
        </p>
      </Section>

      {/* How ranking works */}
      <Section title="How Ranking Works"
               description="Creators who pass all filters are ranked by content quality, not audience size:">
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <span className="w-16 text-right font-semibold text-brand-600">55%</span>
            <span>Engagement Rate — how actively their audience interacts (likes, comments, shares)</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-16 text-right font-semibold text-brand-600 pt-0.5">45%</span>
            <div>
              <span>Reels Activity — what percentage of their posts are video Reels</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Creators posting 80%+ Reels score highest. Bonus point if their average Reel views exceed 50% of their follower count (videos actually get watched, not just posted).
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Audience Reach Labels</p>
            <p className="text-xs text-gray-500 mb-2">
              Your follower filter range ({parseInt(minFollowers).toLocaleString()} – {parseInt(maxFollowers).toLocaleString()}) is split into three equal thirds. Each creator gets a label based on where their follower count falls:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border text-purple-700 bg-purple-50 border-purple-200">
                High Reach — upper third ({Math.round(parseInt(minFollowers) + (parseInt(maxFollowers) - parseInt(minFollowers)) * 0.66).toLocaleString()}+)
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                Mid Reach — middle third
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border text-teal-700 bg-teal-50 border-teal-200">
                Emerging Reach — lower third (under {Math.round(parseInt(minFollowers) + (parseInt(maxFollowers) - parseInt(minFollowers)) * 0.33).toLocaleString()})
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              These labels don&apos;t affect the score — they&apos;re a quick visual so you can see if a creator is on the smaller or larger end of your filter range.
            </p>
          </div>
        </div>
      </Section>

      {/* Ambassador Tiers */}
      <Section title="Ambassador Tiers"
               description="Each creator is categorised into a tier based on their follower count. Set the cost per video for each tier.">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                  High Profile
                </span>
                <span className="text-xs text-gray-500">50,000+ followers</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Top-tier creators with large, established audiences</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={costHighProfile}
                onChange={(e) => setCostHighProfile(e.target.value)}
                className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-brand-500 text-right"
              />
              <span className="text-xs text-gray-400">/video</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                  Brand Ambassador
                </span>
                <span className="text-xs text-gray-500">5,000 – 49,999 followers</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Niche creators with strong community engagement</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={costBrandAmbassador}
                onChange={(e) => setCostBrandAmbassador(e.target.value)}
                className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-brand-500 text-right"
              />
              <span className="text-xs text-gray-400">/video</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg border border-teal-200 bg-teal-50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border text-teal-700 bg-teal-50 border-teal-200">
                  Community Ambassador
                </span>
                <span className="text-xs text-gray-500">Under 5,000 followers</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Local creators and team members</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={costCommunityAmbassador}
                onChange={(e) => setCostCommunityAmbassador(e.target.value)}
                className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-brand-500 text-right"
              />
              <span className="text-xs text-gray-400">/video</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Outreach Template */}
      <Section title="Outreach Message"
               description="DM template for approved creators. Variables get replaced automatically.">
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
          placeholder="Hey {{first_name}}! We've been checking out your spearfishing content and love what you're doing..."
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
          disabled={isSaving}
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

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
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
