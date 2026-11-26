'use client';

import * as React from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import {
  DEFAULT_AVAILABILITY_SCHEDULE,
  getProfessionalAvailability,
  saveProfessionalAvailability,
} from '@/services/professionals.service';
import type { AvailabilitySchedule, WeekdayKey } from '@/types/domain';

const DAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export default function ProfessionalAvailabilityPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();
  const [schedule, setSchedule] = React.useState<AvailabilitySchedule | null>(null);
  const [newDayOff, setNewDayOff] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!firebaseUser) return;
    void getProfessionalAvailability(firebaseUser.uid)
      .then(setSchedule)
      .catch(() => setSchedule(DEFAULT_AVAILABILITY_SCHEDULE(firebaseUser.uid)));
  }, [firebaseUser]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!schedule) return;
    setSaving(true);
    try {
      const saved = await saveProfessionalAvailability(schedule);
      setSchedule(saved);
      notify({ tone: 'success', title: 'Availability schedule updated' });
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

  if (!schedule) return <LoadingSkeleton className="h-[460px]" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar & Hours"
        title="Availability Management"
        description="Configure weekly working hours, flexible request support, days off, or temporary unavailability."
      />

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 rounded-2xl border border-[#E9E5EF] p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={schedule.flexibleScheduling}
                onChange={(e) =>
                  setSchedule({ ...schedule, flexibleScheduling: e.target.checked })
                }
                className="mt-1 h-4 w-4 accent-[#7655D9]"
              />
              <div>
                <p className="text-sm font-semibold text-[#242331]">Flexible Scheduling</p>
                <p className="text-xs text-[#6B6879]">
                  Accept custom-date requests even outside standard weekly slots.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-[#FFF0F3]/40 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={schedule.temporaryUnavailable}
                onChange={(e) =>
                  setSchedule({ ...schedule, temporaryUnavailable: e.target.checked })
                }
                className="mt-1 h-4 w-4 accent-rose-600"
              />
              <div>
                <p className="text-sm font-semibold text-[#242331]">Temporarily Unavailable</p>
                <p className="text-xs text-[#6B6879]">
                  Pause receiving matched request notifications while away.
                </p>
              </div>
            </label>
          </div>

          {schedule.temporaryUnavailable && (
            <Input
              label="Unavailability Note"
              placeholder="e.g., Out of city until 15th of next month"
              value={schedule.unavailableReason || ''}
              onChange={(e) =>
                setSchedule({ ...schedule, unavailableReason: e.target.value })
              }
            />
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#242331]">Weekly Working Hours</h2>
            <div className="space-y-2">
              {(Object.keys(DAY_LABELS) as WeekdayKey[]).map((day) => {
                const cfg = schedule.weeklyHours[day];
                return (
                  <div
                    key={day}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E9E5EF] px-4 py-3 text-sm"
                  >
                    <label className="inline-flex items-center gap-2.5 font-medium text-[#242331] min-w-[120px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) =>
                          setSchedule({
                            ...schedule,
                            weeklyHours: {
                              ...schedule.weeklyHours,
                              [day]: { ...cfg, enabled: e.target.checked },
                            },
                          })
                        }
                        className="h-4 w-4 accent-[#7655D9]"
                      />
                      {DAY_LABELS[day]}
                    </label>
                    {cfg.enabled ? (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={cfg.start}
                          onChange={(e) =>
                            setSchedule({
                              ...schedule,
                              weeklyHours: {
                                ...schedule.weeklyHours,
                                [day]: { ...cfg, start: e.target.value },
                              },
                            })
                          }
                          className="rounded-lg border border-[#E9E5EF] px-2 py-1"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={cfg.end}
                          onChange={(e) =>
                            setSchedule({
                              ...schedule,
                              weeklyHours: {
                                ...schedule.weeklyHours,
                                [day]: { ...cfg, end: e.target.value },
                              },
                            })
                          }
                          className="rounded-lg border border-[#E9E5EF] px-2 py-1"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-[#6B6879]">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#242331]">Days Off</h2>
            <div className="flex gap-2 max-w-sm">
              <Input
                type="date"
                value={newDayOff}
                onChange={(e) => setNewDayOff(e.target.value)}
              />
              <Button
                type="button"
                variant="soft"
                onClick={() => {
                  if (!newDayOff || schedule.daysOff.includes(newDayOff)) return;
                  setSchedule({
                    ...schedule,
                    daysOff: [...schedule.daysOff, newDayOff].sort(),
                  });
                  setNewDayOff('');
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {schedule.daysOff.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {schedule.daysOff.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E9E5EF] bg-[#FFFCF8] px-3 py-1 text-xs"
                  >
                    <Calendar className="h-3 w-3 text-[#7655D9]" />
                    {d}
                    <button
                      type="button"
                      onClick={() =>
                        setSchedule({
                          ...schedule,
                          daysOff: schedule.daysOff.filter((x) => x !== d),
                        })
                      }
                      aria-label="Remove day off"
                      className="text-[#6B6879] hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" loading={saving}>
            Save Availability Schedule
          </Button>
        </form>
      </Card>
    </div>
  );
}
