'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import {
  DEFAULT_PLATFORM_SETTINGS,
  fetchPublicContent,
  savePlatformSettingsAdmin,
  savePromotionBannerAdmin,
} from '@/services/content.service';
import type { PlatformSettings, PromotionBanner } from '@/types/domain';

export default function AdminContentManagementPage() {
  const { notify } = useToast();
  const [settings, setSettings] = React.useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [promotions, setPromotions] = React.useState<PromotionBanner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [promoTitle, setPromoTitle] = React.useState('');
  const [promoSub, setPromoSub] = React.useState('');
  const [promoCta, setPromoCta] = React.useState('Explore');
  const [promoUrl, setPromoUrl] = React.useState('/explore');
  const [promoTone, setPromoTone] = React.useState<PromotionBanner['accentTone']>('lavender');

  React.useEffect(() => {
    void fetchPublicContent()
      .then((res) => {
        setSettings(res.settings);
        setPromotions(res.promotions);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await savePlatformSettingsAdmin(settings);
      notify({ tone: 'success', title: 'Platform content updated in Firestore' });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoTitle.trim()) return;
    const banner: PromotionBanner = {
      id: `promo_${Date.now()}`,
      title: promoTitle.trim(),
      subtitle: promoSub.trim(),
      ctaLabel: promoCta.trim(),
      ctaUrl: promoUrl.trim(),
      placement: 'mid_banner',
      accentTone: promoTone,
      active: true,
      sortOrder: promotions.length + 1,
      updatedAt: new Date().toISOString(),
    };
    await savePromotionBannerAdmin(banner);
    setPromotions((prev) => [...prev, banner]);
    setPromoTitle('');
    setPromoSub('');
    notify({ tone: 'success', title: 'Promotion banner published' });
  }

  if (loading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CMS & Promotions"
        title="Platform Content Management"
        description="Manage homepage copy, announcement bar, contact details, FAQs, and active promotion banners."
      />

      <Card className="p-6">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <h2 className="text-base font-semibold text-[#242331]">Homepage &amp; Support Content</h2>
          <label className="inline-flex items-center gap-2 text-sm text-[#242331]">
            <input
              type="checkbox"
              checked={settings.announcementActive}
              onChange={(e) =>
                setSettings({ ...settings, announcementActive: e.target.checked })
              }
              className="accent-[#7655D9]"
            />
            Show announcement banner at top of homepage
          </label>
          <Input
            label="Announcement Banner Text"
            value={settings.announcementText}
            onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
          />
          <Input
            label="Hero Title"
            value={settings.heroTitle}
            onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
          />
          <Textarea
            label="Hero Subtitle"
            value={settings.heroSubtitle}
            onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
            rows={2}
          />
          <Input
            label="Support Email Display"
            value={settings.supportEmail}
            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
          />
          <Button type="submit" loading={saving}>
            Save Homepage Content
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#242331]">Promotional Banners</h2>
        <form onSubmit={handleAddPromo} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Promotion Title"
            value={promoTitle}
            onChange={(e) => setPromoTitle(e.target.value)}
            required
          />
          <Select
            label="Accent Tone"
            value={promoTone}
            onChange={(e) =>
              setPromoTone(e.target.value as PromotionBanner['accentTone'])
            }
          >
            <option value="lavender">Lavender</option>
            <option value="blush">Blush</option>
            <option value="peach">Peach</option>
            <option value="mint">Mint</option>
          </Select>
          <Input
            label="Subtitle"
            value={promoSub}
            onChange={(e) => setPromoSub(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="CTA Label"
              value={promoCta}
              onChange={(e) => setPromoCta(e.target.value)}
            />
            <Input
              label="CTA Path"
              value={promoUrl}
              onChange={(e) => setPromoUrl(e.target.value)}
            />
          </div>
          <div>
            <Button type="submit" size="sm">
              <Plus className="h-4 w-4" />
              Create Banner
            </Button>
          </div>
        </form>

        <div className="space-y-2 pt-2">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-[#E9E5EF] p-3 text-xs"
            >
              <div>
                <p className="font-semibold text-[#242331]">{p.title}</p>
                <p className="text-[#6B6879]">{p.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={p.active ? 'mint' : 'neutral'}>
                  {p.active ? 'Active' : 'Paused'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const next = { ...p, active: !p.active };
                    await savePromotionBannerAdmin(next);
                    setPromotions((prev) => prev.map((x) => (x.id === p.id ? next : x)));
                  }}
                >
                  {p.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
