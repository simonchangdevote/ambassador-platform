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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const templateVars = getTemplateVariables();

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
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
               description="Creators who pass all filters are ranked automatically by:">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <span className="w-16 text-right font-semibold text-brand-600">40%</span>
            <span>Engagement Rate — how engaged their audience is</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 text-right font-semibold text-brand-600">30%</span>
            <span>Audience Size — sweet spot scoring (5K–50K ideal)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 text-right font-semibold text-brand-600">30%</span>
            <span>Reels Activity — how much video content they produce</span>
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
