'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeBadge } from './QRCodeBadge';
import { generateVCard } from '../vcard';
import { Save, Image as ImageIcon, Palette, Layout } from 'lucide-react';
import toast from 'react-hot-toast';

export interface BadgeConfig {
  bgUrl?: string;
  textColor?: string;
  accentColor?: string;
  logoUrl?: string;
  qrSize?: number;
  layout?: 'standard' | 'compact' | 'modern';
}

const mockAgent = {
  name: 'Ahmed Yassine',
  jobTitle: 'Senior Sales Agent',
  email: 'ahmed.yassine@wasla.dz',
  company: 'Wasla Tech',
  phone: '+213 555 123 456',
  // photoUrl is intentionally omitted here — the PHOTO field will only
  // appear in the vCard when a real agent has a photo_url set in the DB
};

export function BadgeDesigner() {
  const [config, setConfig] = useState<BadgeConfig>({
    bgUrl: '',
    textColor: '#ffffff',
    accentColor: '#4f46e5',
    logoUrl: '',
    qrSize: 180,
    layout: 'standard'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/badge-config')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setConfig(res.data);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleChange = (k: keyof BadgeConfig, v: any) => {
    setConfig(prev => ({ ...prev, [k]: v }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/badge-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Configuration saved successfully!');
      } else {
        toast.error('Failed to save: ' + data.error);
      }
    } catch (e) {
      toast.error('Network error while saving');
    }
    setSaving(false);
  };

  const mockVcard = generateVCard(mockAgent);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading designer...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto p-4">
      {/* Configuration Panel */}
      <div className="w-full md:w-1/2 space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            Badge Designer
          </h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Design'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Layout Style</label>
            <div className="grid grid-cols-3 gap-2">
              {['standard', 'modern', 'compact'].map(l => (
                <button
                  key={l}
                  onClick={() => handleChange('layout', l)}
                  className={`p-2 text-sm rounded-lg border capitalize ${config.layout === l ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' : 'hover:bg-gray-50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Background Image URL
            </label>
            <input
              type="text"
              value={config.bgUrl || ''}
              onChange={e => handleChange('bgUrl', e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 ring-indigo-500 outline-none"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Center Logo URL (for QR Code)
            </label>
            <input
              type="text"
              value={config.logoUrl || ''}
              onChange={e => handleChange('logoUrl', e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 ring-indigo-500 outline-none"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.textColor || '#ffffff'}
                  onChange={e => handleChange('textColor', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.textColor || '#ffffff'}
                  onChange={e => handleChange('textColor', e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Size ({config.qrSize}px)</label>
              <input
                type="range"
                min="100"
                max="300"
                value={config.qrSize || 180}
                onChange={e => handleChange('qrSize', parseInt(e.target.value))}
                className="w-full mt-2 cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-gray-50 p-8 rounded-2xl border border-gray-200">
        <h3 className="text-gray-500 text-sm mb-4 tracking-wider uppercase">Live Preview</h3>
        
        {/* Render the actual Badge Design */}
        <BadgePreview agent={mockAgent} config={config} vcardData={mockVcard} />
      </div>
    </div>
  );
}

// Factorized Preview Component to be reused for printing
export function BadgePreview({ agent, config, vcardData }: { agent: any, config: BadgeConfig, vcardData: string }) {
  
  const bgStyle = config.bgUrl ? {
    backgroundImage: `url(${config.bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {
    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
  };

  const isModern = config.layout === 'modern';
  const isCompact = config.layout === 'compact';

  return (
    <div 
      className={`badge-card relative overflow-hidden flex ${isModern ? 'flex-row' : 'flex-col items-center'} shadow-2xl transition-all duration-300`}
      style={{
        ...bgStyle,
        width: isModern ? '500px' : '320px',
        height: isModern ? '280px' : '480px',
        color: config.textColor || '#ffffff',
        borderRadius: '16px'
      }}
    >
      {/* Overlay for better text readability if there's a BG */}
      {config.bgUrl && <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>}

      <div className={`relative z-10 w-full h-full flex ${isModern ? 'flex-row items-center p-8 gap-8' : 'flex-col items-center justify-between p-8'}`}>
        
        <div className={`flex flex-col ${isModern ? 'justify-start items-start flex-1' : 'items-center text-center mt-2'}`}>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {agent.name}
          </h1>
          <h2 className="text-lg opacity-90 font-medium tracking-wide">
            {agent.jobTitle}
          </h2>
          <div className="mt-4 opacity-75 text-sm space-y-1">
            <p>{agent.company}</p>
          </div>
        </div>

        <div className={`${isModern ? 'shrink-0' : 'mb-4'}`}>
          <QRCodeBadge
            value={vcardData}
            logoUrl={config.logoUrl}
            size={config.qrSize}
            fgColor="#000"
            bgColor="#fff"
            className="shadow-2xl ring-4 ring-white/20"
          />
          {!isModern && !isCompact && (
            <p className="text-xs text-center mt-4 opacity-80 uppercase tracking-widest font-semibold">
              Scan to Connect
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
