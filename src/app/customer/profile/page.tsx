'use client';

import * as React from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader, type UploadedItem } from '@/components/ui/ImageUploader';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import {
  deleteCustomerAddress,
  getCustomerProfile,
  listCustomerAddresses,
  saveCustomerAddress,
  upsertCustomerProfile,
} from '@/services/customers.service';
import type { CategoryRecord, SavedAddress } from '@/types/domain';

export default function CustomerProfilePage() {
  const { firebaseUser, userRecord, refreshUserRecord } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [city, setCity] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [preferredCategories, setPreferredCategories] = React.useState<string[]>([]);
  const [photoItems, setPhotoItems] = React.useState<UploadedItem[]>([]);
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [addresses, setAddresses] = React.useState<SavedAddress[]>([]);

  const [addrModalOpen, setAddrModalOpen] = React.useState(false);
  const [addrLabel, setAddrLabel] = React.useState('Home');
  const [addrLine1, setAddrLine1] = React.useState('');
  const [addrLocality, setAddrLocality] = React.useState('');
  const [addrCity, setAddrCity] = React.useState('');
  const [addrState, setAddrState] = React.useState('');
  const [addrPostal, setAddrPostal] = React.useState('');
  const [addrDefault, setAddrDefault] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [cust, catRes, addrList] = await Promise.all([
        getCustomerProfile(firebaseUser.uid).catch(() => null),
        fetchActiveCategoriesAndSubcategories(),
        listCustomerAddresses(firebaseUser.uid).catch(() => []),
      ]);
      if (!active) return;

      setCategories(catRes.categories);
      setAddresses(addrList);
      setFullName(cust?.fullName || userRecord?.displayName || '');
      setPhone(cust?.phone || userRecord?.phone || '');
      setCity(cust?.defaultLocation?.city || '');
      setLocality(cust?.defaultLocation?.locality || '');
      setPostalCode(cust?.defaultLocation?.postalCode || '');
      setPreferredCategories(cust?.preferredCategories || []);
      if (cust?.photoURL) {
        setPhotoItems([{ id: 'avatar', url: cust.photoURL, storagePath: '' }]);
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser, userRecord]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await upsertCustomerProfile(firebaseUser.uid, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        email: firebaseUser.email || null,
        photoURL: photoItems[0]?.url || null,
        defaultLocation: {
          city: city.trim(),
          locality: locality.trim(),
          postalCode: postalCode.trim(),
          country: 'India',
        },
        preferredCategories,
      });
      await refreshUserRecord();
      notify({ tone: 'success', title: 'Customer profile updated' });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    const saved = await saveCustomerAddress(firebaseUser.uid, {
      label: addrLabel,
      line1: addrLine1,
      locality: addrLocality,
      city: addrCity,
      state: addrState,
      postalCode: addrPostal,
      country: 'India',
      isDefault: addrDefault,
    });
    setAddresses((prev) => [saved, ...prev]);
    setAddrModalOpen(false);
    setAddrLine1('');
    setAddrLocality('');
    setAddrCity('');
    setAddrPostal('');
    notify({ tone: 'success', title: 'Address saved' });
  }

  async function handleDeleteAddress(id: string) {
    await deleteCustomerAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    notify({ tone: 'info', title: 'Address deleted' });
  }

  if (loading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer Profile"
        title="Personal Details & Saved Addresses"
        description="Your contact details and exact street addresses stay private until a booking is confirmed."
      />

      <Card className="p-6">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {firebaseUser && (
            <ImageUploader
              folder={{ type: 'user_profile', uid: firebaseUser.uid }}
              items={photoItems}
              onChange={setPhotoItems}
              maxFiles={1}
              label="Profile Photo"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
            />
            <Input
              label="Default City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Default Locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
            />
            <Input
              label="Postal Code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#242331]">Preferred Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = preferredCategories.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setPreferredCategories((prev) =>
                        active ? prev.filter((c) => c !== cat.slug) : [...prev, cat.slug]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer ${
                      active
                        ? 'border-[#7655D9] bg-[#7655D9] text-white'
                        : 'border-[#E9E5EF] bg-white text-[#242331]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" loading={saving}>
            Save Profile Changes
          </Button>
        </form>
      </Card>

      {/* Saved Addresses */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#242331]">Saved Addresses</h2>
            <p className="text-xs text-[#6B6879]">
              Used privately when posting at-home requirements.
            </p>
          </div>
          <Button size="sm" variant="soft" onClick={() => setAddrModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-sm text-[#6B6879]">No saved addresses yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border border-[#E9E5EF] p-4 flex items-start justify-between gap-3"
              >
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#7655D9]" />
                    <span className="font-semibold text-[#242331]">{addr.label}</span>
                    {addr.isDefault && <Badge tone="lavender">Default</Badge>}
                  </div>
                  <p className="text-[#6B6879]">{addr.line1}</p>
                  <p className="text-[#6B6879]">
                    {addr.locality}, {addr.city} {addr.postalCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteAddress(addr.id)}
                  aria-label="Delete address"
                  className="text-[#6B6879] hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={addrModalOpen}
        onClose={() => setAddrModalOpen(false)}
        title="Save New Address"
      >
        <form onSubmit={handleAddAddress} className="space-y-4">
          <Input
            label="Label"
            value={addrLabel}
            onChange={(e) => setAddrLabel(e.target.value)}
            placeholder="Home, Venue, Studio..."
            required
          />
          <Input
            label="Street / Flat / Building (Private)"
            value={addrLine1}
            onChange={(e) => setAddrLine1(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Locality"
              value={addrLocality}
              onChange={(e) => setAddrLocality(e.target.value)}
              required
            />
            <Input
              label="City"
              value={addrCity}
              onChange={(e) => setAddrCity(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="State"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value)}
            />
            <Input
              label="Postal Code"
              value={addrPostal}
              onChange={(e) => setAddrPostal(e.target.value)}
              required
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[#242331]">
            <input
              type="checkbox"
              checked={addrDefault}
              onChange={(e) => setAddrDefault(e.target.checked)}
              className="h-4 w-4 accent-[#7655D9]"
            />
            Set as default address
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddrModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Address</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
