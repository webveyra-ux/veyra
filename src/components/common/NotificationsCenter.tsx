'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { isPushNotificationsConfigured, requestWebPushToken } from '@/lib/firebase/client';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  deleteNotificationItem,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications.service';

export function NotificationsCenter() {
  const router = useRouter();
  const { notifications, unreadNotificationsCount } = useAuth();
  const { notify } = useToast();
  const [filterUnread, setFilterUnread] = React.useState(false);

  const visible = filterUnread ? notifications.filter((n) => !n.read) : notifications;

  async function handleEnablePush() {
    const res = await requestWebPushToken();
    if (res.token) {
      notify({ tone: 'success', title: 'Browser push notifications enabled' });
    } else {
      notify({
        tone: 'info',
        title: 'Push notifications unavailable',
        description: res.reason,
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Real-time alerts for matched requests, proposals, messages, bookings, and verification."
        actions={
          <div className="flex flex-wrap gap-2">
            {isPushNotificationsConfigured && (
              <Button variant="outline" size="sm" onClick={handleEnablePush}>
                Enable Web Push
              </Button>
            )}
            {unreadNotificationsCount > 0 && (
              <Button
                variant="soft"
                size="sm"
                onClick={() => void markAllNotificationsRead(notifications)}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={!filterUnread ? 'primary' : 'outline'}
          onClick={() => setFilterUnread(false)}
        >
          All ({notifications.length})
        </Button>
        <Button
          size="sm"
          variant={filterUnread ? 'primary' : 'outline'}
          onClick={() => setFilterUnread(true)}
        >
          Unread ({unreadNotificationsCount})
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications to show"
          description="You are caught up. New marketplace activity will appear here automatically."
        />
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'p-4 flex items-start justify-between gap-4 transition-colors',
                !item.read && 'border-[#7655D9]/40 bg-[#F5F0FF]/55'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  void markNotificationRead(item.id);
                  if (item.actionUrl) router.push(item.actionUrl);
                }}
                className="flex-1 text-left cursor-pointer"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#242331]">{item.title}</span>
                  {!item.read && <Badge tone="lavender">New</Badge>}
                  <span className="text-xs text-[#6B6879]">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#6B6879]">{item.message}</p>
              </button>
              <button
                type="button"
                aria-label="Delete notification"
                onClick={() => void deleteNotificationItem(item.id)}
                className="rounded-lg p-2 text-[#6B6879] hover:bg-[#FFF0F3] hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
