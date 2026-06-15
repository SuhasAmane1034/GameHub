import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, Save, IndianRupee, Percent, Palette, Globe, MapPin, Clock, Image } from 'lucide-react';
import { useSettingsStore, CafeInfo, Pricing, ThemeSettingsConfig } from '../store/useSettingsStore.js';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';
import { useThemeStore } from '../store/useThemeStore.js';

export const SettingsPage: React.FC = () => {
  const { fetchSettings, cafeInfo, pricing, themeSettings, updateCafeInfo, updatePricing, updateAppearance, isLoading } = useSettingsStore();
  const { addToast } = useSessionTimerStore();

  const [activeTab, setActiveTab] = useState<'branding' | 'appearance' | 'pricing' | 'social' | 'contact' | 'hours'>('branding');

  // Form State
  const [infoForm, setInfoForm] = useState<CafeInfo>({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    googleMapsUrl: '',
    logoUrl: '',
    gstNumber: '',
    enableGst: true,
    gstRate: 18,
    workingHours: {
      monday: { open: '10:00', close: '23:00' },
      tuesday: { open: '10:00', close: '23:00' },
      wednesday: { open: '10:00', close: '23:00' },
      thursday: { open: '10:00', close: '23:00' },
      friday: { open: '10:00', close: '23:59' },
      saturday: { open: '09:00', close: '23:59' },
      sunday: { open: '09:00', close: '23:59' }
    }
  });

  const [pricingForm, setPricingForm] = useState<Pricing>({
    ps5: { '1': 100, '2': 150, '3': 200, '4': 250 },
    pc: { keyboard_mouse: 80, controller: 100 }
  });

  const [appearanceForm, setAppearanceForm] = useState<ThemeSettingsConfig>({
    themeMode: 'dark',
    primaryColor: '#5B8CFF',
    secondaryColor: '#8B5CF6',
    fontFamily: 'Inter',
    borderRadius: 'large',
    cardStyle: 'glass',
    animationLevel: 'premium',
    sidebarStyle: 'floating',
    dashboardLayout: 'gaming',
    backgroundStyle: 'gradient',
    logo: '',
    brandName: 'GameHub'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  // Sync state with store on fetch complete
  useEffect(() => {
    if (cafeInfo) setInfoForm(cafeInfo);
    if (pricing) setPricingForm(pricing);
    if (themeSettings) setAppearanceForm(themeSettings);
  }, [cafeInfo, pricing, themeSettings]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateCafeInfo(infoForm);
    if (success) {
      addToast('Cafe profile settings saved', 'success');
    } else {
      addToast('Failed to update cafe settings', 'danger');
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updatePricing(pricingForm);
    if (success) {
      addToast('Pricing configurations applied', 'success');
    } else {
      addToast('Failed to update pricing rules', 'danger');
    }
  };

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateAppearance(appearanceForm);
    if (success) {
      addToast('Appearance layout and theme applied', 'success');
      // Apply the theme settings locally immediately
      useThemeStore.getState().fetchThemeSettings();
    } else {
      addToast('Failed to apply theme preferences', 'danger');
    }
  };

  const tabClass = (tab: typeof activeTab) => 
    `flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
      activeTab === tab 
        ? 'border-game-primary text-white bg-slate-800/40' 
        : 'border-transparent text-game-muted hover:text-white hover:bg-slate-900/40'
    }`;

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          System Control Center
        </h2>
        <p className="text-xs text-game-muted mt-0.5">
          Configure branding settings, appearance modes, rate pricing structures, and contact properties.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-800 bg-[#141B34]/40 rounded-t-xl overflow-x-auto scrollbar-none">
        <button onClick={() => setActiveTab('branding')} className={tabClass('branding')}>
          <Image className="w-4 h-4 text-sky-400" />
          Branding & Identity
        </button>
        <button onClick={() => setActiveTab('appearance')} className={tabClass('appearance')}>
          <Palette className="w-4 h-4 text-purple-400" />
          Appearance Theme
        </button>
        <button onClick={() => setActiveTab('pricing')} className={tabClass('pricing')}>
          <IndianRupee className="w-4 h-4 text-emerald-400" />
          Pricing Rules
        </button>
        <button onClick={() => setActiveTab('social')} className={tabClass('social')}>
          <Globe className="w-4 h-4 text-pink-400" />
          Social Connections
        </button>
        <button onClick={() => setActiveTab('contact')} className={tabClass('contact')}>
          <MapPin className="w-4 h-4 text-amber-400" />
          Contact & Location
        </button>
        <button onClick={() => setActiveTab('hours')} className={tabClass('hours')}>
          <Clock className="w-4 h-4 text-indigo-400" />
          Working Hours
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-[#141B34] border border-slate-800 rounded-b-xl p-6 shadow-neon-primary/5">
        
        {/* 1. Branding Tab */}
        {activeTab === 'branding' && (
          <form onSubmit={handleSaveInfo} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Cafe Branding & Name
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Cafe Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full game-input text-sm py-2"
                  value={infoForm.name}
                  onChange={e => setInfoForm({ ...infoForm, name: e.target.value })}
                  placeholder="e.g. GameHub"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Slogan / Tagline
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  value={infoForm.tagline}
                  onChange={e => setInfoForm({ ...infoForm, tagline: e.target.value })}
                  placeholder="e.g. Your Ultimate Gaming Destination"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Logo Image URL
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  value={infoForm.logoUrl}
                  onChange={e => setInfoForm({ ...infoForm, logoUrl: e.target.value })}
                  placeholder="e.g. https://domain.com/logo.png"
                />
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Provide an absolute path to a PNG/SVG image for branding. If empty, the system defaults to "GH" logo.
                </span>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800/80 pt-4">
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4">
                <Save className="w-4 h-4" />
                Save Branding
              </button>
            </div>
          </form>
        )}

        {/* 2. Appearance Tab */}
        {activeTab === 'appearance' && (
          <form onSubmit={handleSaveAppearance} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Theme Management Engine
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Theme Mode */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Theme Mode
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.themeMode}
                  onChange={e => setAppearanceForm({ ...appearanceForm, themeMode: e.target.value as any })}
                >
                  <option value="dark">Dark Mode</option>
                  <option value="light">Light Mode</option>
                  <option value="system">System Mode</option>
                </select>
              </div>

              {/* Accent Color 1 */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Primary Accent Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 border border-slate-700 bg-transparent rounded cursor-pointer"
                    value={appearanceForm.primaryColor}
                    onChange={e => setAppearanceForm({ ...appearanceForm, primaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 game-input text-sm py-2"
                    value={appearanceForm.primaryColor}
                    onChange={e => setAppearanceForm({ ...appearanceForm, primaryColor: e.target.value })}
                  />
                </div>
              </div>

              {/* Accent Color 2 */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Secondary Accent Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 border border-slate-700 bg-transparent rounded cursor-pointer"
                    value={appearanceForm.secondaryColor}
                    onChange={e => setAppearanceForm({ ...appearanceForm, secondaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 game-input text-sm py-2"
                    value={appearanceForm.secondaryColor}
                    onChange={e => setAppearanceForm({ ...appearanceForm, secondaryColor: e.target.value })}
                  />
                </div>
              </div>

              {/* Fonts */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Font Family Selection
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.fontFamily}
                  onChange={e => setAppearanceForm({ ...appearanceForm, fontFamily: e.target.value as any })}
                >
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Sora">Sora</option>
                  <option value="Space Grotesk">Space Grotesk</option>
                </select>
              </div>

              {/* Border Radius */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Border Radius Size
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.borderRadius}
                  onChange={e => setAppearanceForm({ ...appearanceForm, borderRadius: e.target.value as any })}
                >
                  <option value="small">Small (4px)</option>
                  <option value="medium">Medium (8px)</option>
                  <option value="large">Large (16px)</option>
                  <option value="extra-large">Extra Large (24px)</option>
                </select>
              </div>

              {/* Card Styles */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Card Style Effect
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.cardStyle}
                  onChange={e => setAppearanceForm({ ...appearanceForm, cardStyle: e.target.value as any })}
                >
                  <option value="rounded">Standard Rounded</option>
                  <option value="glass">Glassmorphism Panel</option>
                  <option value="elevated">Deep Shadow Elevated</option>
                  <option value="sharp">Sharp Edges</option>
                </select>
              </div>

              {/* Background Style */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Background Style
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.backgroundStyle}
                  onChange={e => setAppearanceForm({ ...appearanceForm, backgroundStyle: e.target.value as any })}
                >
                  <option value="solid">Solid Colors</option>
                  <option value="glassmorphism">Translucent Glass</option>
                  <option value="gradient">Radial Purple Glow</option>
                  <option value="neon">Dual Neon Orbits</option>
                  <option value="rgb">RGB Animated Spectrum</option>
                </select>
              </div>

              {/* Sidebar Style */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Admin Sidebar Style
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.sidebarStyle}
                  onChange={e => setAppearanceForm({ ...appearanceForm, sidebarStyle: e.target.value as any })}
                >
                  <option value="floating">Floating Panel</option>
                  <option value="expanded">Expanded Sidebar</option>
                  <option value="compact">Compact Icons</option>
                  <option value="glass">Glass Blurred Sidebar</option>
                </select>
              </div>

              {/* Layout option */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Dashboard Layout
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.dashboardLayout}
                  onChange={e => setAppearanceForm({ ...appearanceForm, dashboardLayout: e.target.value as any })}
                >
                  <option value="gaming">Gaming Neon Theme</option>
                  <option value="default">Standard SaaS</option>
                  <option value="modern">Modern Clean Minimal</option>
                </select>
              </div>

              {/* Animation Speed */}
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Animation Level
                </label>
                <select
                  className="w-full game-input text-sm py-2 bg-slate-900"
                  value={appearanceForm.animationLevel}
                  onChange={e => setAppearanceForm({ ...appearanceForm, animationLevel: e.target.value as any })}
                >
                  <option value="off">Off (Disable Motion)</option>
                  <option value="minimal">Minimal Hover Checks</option>
                  <option value="normal">Normal UI Transitions</option>
                  <option value="premium">Premium Micro-animations</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800/80 pt-4">
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-neon-secondary">
                <Palette className="w-4 h-4" />
                Apply Settings
              </button>
            </div>
          </form>
        )}

        {/* 3. Pricing Tab */}
        {activeTab === 'pricing' && (
          <form onSubmit={handleSavePricing} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Console & LAN Station Rates
            </h3>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-game-primary uppercase tracking-widest">
                PlayStation 5 Console Matrix (₹/hr)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(p => (
                  <div key={p} className="p-3 bg-[#0B1020]/50 border border-slate-800/60 rounded-lg">
                    <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                      {p} {p === 1 ? 'Player' : 'Players'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full game-input text-xs font-mono py-1.5"
                      value={pricingForm.ps5[p.toString() as '1' | '2' | '3' | '4']}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setPricingForm({
                          ...pricingForm,
                          ps5: { ...pricingForm.ps5, [p.toString()]: val }
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-black text-game-secondary uppercase tracking-widest">
                PC Gaming Station Rates (₹/hr)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-[#0B1020]/50 border border-slate-800/60 rounded-lg">
                  <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                    Keyboard + Mouse Setup
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full game-input text-xs font-mono py-1.5"
                    value={pricingForm.pc.keyboard_mouse}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setPricingForm({
                        ...pricingForm,
                        pc: { ...pricingForm.pc, keyboard_mouse: val }
                      });
                    }}
                  />
                </div>
                <div className="p-3 bg-[#0B1020]/50 border border-slate-800/60 rounded-lg">
                  <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                    Controller Layout Setup
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full game-input text-xs font-mono py-1.5"
                    value={pricingForm.pc.controller}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setPricingForm({
                        ...pricingForm,
                        pc: { ...pricingForm.pc, controller: val }
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800/80 pt-4">
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 bg-gradient-to-r from-game-success to-emerald-600 shadow-neon-success">
                <Save className="w-4 h-4" />
                Apply Pricing
              </button>
            </div>
          </form>
        )}

        {/* 4. Social Links Tab */}
        {activeTab === 'social' && (
          <form onSubmit={handleSaveInfo} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Social Links & Contacts
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  WhatsApp Contact number
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  value={infoForm.whatsapp}
                  onChange={e => setInfoForm({ ...infoForm, whatsapp: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  value={infoForm.instagram}
                  onChange={e => setInfoForm({ ...infoForm, instagram: e.target.value })}
                  placeholder="e.g. gamehub_cafe"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Facebook Link
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  placeholder="e.g. facebook.com/gamehub"
                  value={(infoForm as any).facebook || ''}
                  onChange={e => setInfoForm({ ...infoForm, [(infoForm as any).facebook]: e.target.value } as any)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  YouTube Channel ID
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  placeholder="e.g. youtube.com/c/gamehub"
                  value={(infoForm as any).youtube || ''}
                  onChange={e => setInfoForm({ ...infoForm, [(infoForm as any).youtube]: e.target.value } as any)}
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800/80 pt-4">
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4">
                <Save className="w-4 h-4" />
                Save Social Links
              </button>
            </div>
          </form>
        )}

        {/* 5. Contact Tab */}
        {activeTab === 'contact' && (
          <form onSubmit={handleSaveInfo} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Location & Contact Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  className="w-full game-input text-sm py-2"
                  value={infoForm.phone}
                  onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className="w-full game-input text-sm py-2"
                  value={infoForm.email}
                  onChange={e => setInfoForm({ ...infoForm, email: e.target.value })}
                  placeholder="e.g. support@gamehub.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Physical Address *
                </label>
                <textarea
                  required
                  rows={2}
                  className="w-full game-input text-sm py-2 resize-none"
                  value={infoForm.address}
                  onChange={e => setInfoForm({ ...infoForm, address: e.target.value })}
                  placeholder="Address to show on footer and contact portal"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                  Google Maps Location Link
                </label>
                <input
                  type="text"
                  className="w-full game-input text-sm py-2"
                  value={infoForm.googleMapsUrl}
                  onChange={e => setInfoForm({ ...infoForm, googleMapsUrl: e.target.value })}
                  placeholder="e.g. https://maps.google.com/?q=..."
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800/80 pt-4">
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4">
                <Save className="w-4 h-4" />
                Save Contacts
              </button>
            </div>
          </form>
        )}

        {/* 6. Hours Tab */}
        {activeTab === 'hours' && (
          <form onSubmit={handleSaveInfo} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Working Hours Config
            </h3>

            <div className="space-y-4">
              {Object.keys(infoForm.workingHours).map((day) => {
                const dayKey = day as keyof typeof infoForm.workingHours;
                return (
                  <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-[#0B1020]/40 border border-slate-800/60 rounded-lg">
                    <span className="text-xs font-extrabold uppercase text-white w-28 capitalize">
                      {day}
                    </span>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-game-muted uppercase">Open:</span>
                        <input
                          type="text"
                          className="w-20 game-input text-xs text-center font-mono py-1 px-2"
                          value={infoForm.workingHours[dayKey].open}
                          onChange={e => {
                            const val = e.target.value;
                            setInfoForm({
                              ...infoForm,
                              workingHours: {
                                ...infoForm.workingHours,
                                [dayKey]: { ...infoForm.workingHours[dayKey], open: val }
                              }
                            });
                          }}
                          placeholder="10:00"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-game-muted uppercase">Close:</span>
                        <input
                          type="text"
                          className="w-20 game-input text-xs text-center font-mono py-1 px-2"
                          value={infoForm.workingHours[dayKey].close}
                          onChange={e => {
                            const val = e.target.value;
                            setInfoForm({
                              ...infoForm,
                              workingHours: {
                                ...infoForm.workingHours,
                                [dayKey]: { ...infoForm.workingHours[dayKey], close: val }
                              }
                            });
                          }}
                          placeholder="23:00"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end border-t border-slate-800/80 pt-4">
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4">
                <Save className="w-4 h-4" />
                Save Working Hours
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
