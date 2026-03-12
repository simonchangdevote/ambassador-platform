// ============================================================
// SETTINGS — Configure brand criteria, scoring weights, templates
// ============================================================
'use client';

import { useState } from 'react';
import { getTemplateVariables } from '@/lib/message-templates';

export default function SettingsPage() {
  const [brandName, setBrandName] = useState('Your Brand');
  const [hashtags, setHashtags] = useState(
    'spearfishing, spearo, spearfishingaustralia, freediving, divingaustralia, oceanlife'
  );
  const [keywords, setKeywords] = useState(
    'spearfishing, freediving, ocean, reef, australia, cairns, catch and cook'
  );
  const [minFollowers, setMinFollowers] = useState('1000');
  const [maxFollowers, setMaxFollowers] = useState('100000');
  const [minEngagement, setMinEngagement] = useState('2.0');
  const [messageTemplate, setMessageTemplate] = useState(
    `Hey {{first_name}}! We've been checking out your content and love what you're doing.\n\nWe're always on the lookout for passionate creators in the ocean/spearfishing/diving space and we'd love to explore working together.\n\nWe're particularly looking for creators who enjoy making reels and video content, and we'd be keen to chat about sending you some gear and building a partnership.\n\nLet us know if you'd be interested!`
  );

  // Scoring weights
  const [weights, setWeights] = useState({
    content_quality: 25,
    engagement: 25,
    audience_size: 15,
    reels_focus: 20,
    brand_fit: 15,
  });

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const templateVars = getTemplateVariables();

  function handleSave() {
    // TODO: Save to Supabase brand_config table
    alert('Settings saved! (Connect to Supabase to persist)');
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Configure your scouting criteria, scoring weights, and outreach templates.
        </p>
      </div>

      {/* Brand Info */}
      <Section title="Brand Configuration">
        <Field label="Brand Name" value={brandName} onChange={setBrandName} />
        <Field label="Niche Hashtags (comma-separated)" value={hashtags} onChange={setHashtags}
               hint="Hashtags to search when scouting Instagram" />
        <Field label="Keywords (comma-separated)" value={keywords} onChange={setKeywords}
               hint="Keywords to match in creator bios" />
      </Section>

      {/* Target Criteria */}
      <Section title="Target Creator Criteria">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min Followers" value={minFollowers} onChange={setMinFollowers} type="number" />
          <Field label="Max Followers" value={maxFollowers} onChange={setMaxFollowers} type="number" />
        </div>
        <Field label="Min Engagement Rate (%)" value={minEngagement} onChange={setMinEngagement} type="number" />
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
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </Section>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-brand-600 text-white font-medium rounded-lg
                     hover:bg-brand-700 transition-colors"
        >
          Save Settings
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
