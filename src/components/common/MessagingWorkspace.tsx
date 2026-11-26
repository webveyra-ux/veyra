'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Ban,
  Flag,
  Image as ImageIcon,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { ReportModal } from '@/components/common/ReportModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { uploadFileToStorage } from '@/lib/storage/upload';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  markConversationRead,
  sendChatMessage,
  subscribeConversationMessages,
  subscribeUserConversations,
  toggleBlockConversation,
} from '@/services/conversations.service';
import type { ChatMessage, Conversation, MessageAttachment } from '@/types/domain';

function MessagingWorkspaceInner() {
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get('conversationId');
  const { firebaseUser } = useAuth();
  const { notify } = useToast();

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(initialConvId);
  const [convSearch, setConvSearch] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [messageLimit, setMessageLimit] = React.useState(40);
  const [draftText, setDraftText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [uploadingImg, setUploadingImg] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeUserConversations(
      firebaseUser.uid,
      (items) => {
        setConversations(items);
        setLoadingConvs(false);
        setSelectedId((prev) => {
          if (prev && items.some((c) => c.id === prev)) return prev;
          if (initialConvId && items.some((c) => c.id === initialConvId)) return initialConvId;
          return items[0]?.id ?? null;
        });
      },
      () => {
        setLoadingConvs(false);
      }
    );
    return () => unsub();
  }, [firebaseUser, initialConvId]);

  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  React.useEffect(() => {
    if (!activeConversation || !firebaseUser) {
      return;
    }

    const unsub = subscribeConversationMessages(
      activeConversation.id,
      messageLimit,
      (msgs) => {
        setMessages(msgs);
      }
    );
    void markConversationRead(activeConversation, firebaseUser.uid);

    return () => unsub();
  }, [activeConversation, firebaseUser, messageLimit]);

  const visibleMessages = activeConversation && firebaseUser ? messages : [];

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredConversations = React.useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const names = Object.values(c.participantMeta || {})
        .map((m) => m.displayName.toLowerCase())
        .join(' ');
      return (
        c.subjectTitle.toLowerCase().includes(q) ||
        names.includes(q) ||
        c.lastMessageText.toLowerCase().includes(q)
      );
    });
  }, [convSearch, conversations]);

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConversation || !firebaseUser) return;
    if (!draftText.trim()) return;

    setSending(true);
    try {
      await sendChatMessage({
        conversation: activeConversation,
        senderId: firebaseUser.uid,
        text: draftText,
      });
      setDraftText('');
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Message not sent',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setSending(false);
    }
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !firebaseUser) return;
    setUploadingImg(true);
    try {
      const uploaded = await uploadFileToStorage(file, {
        type: 'conversation_attachment',
        conversationId: activeConversation.id,
      });
      const attachment: MessageAttachment = {
        url: uploaded.url,
        storagePath: uploaded.storagePath,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
      };
      await sendChatMessage({
        conversation: activeConversation,
        senderId: firebaseUser.uid,
        text: draftText.trim(),
        attachments: [attachment],
      });
      setDraftText('');
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Attachment failed',
        description: err instanceof Error ? err.message : 'Could not send image.',
      });
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  }

  async function handleBlockToggle() {
    if (!activeConversation || !firebaseUser) return;
    const blockedByMe = activeConversation.blockedBy.includes(firebaseUser.uid);
    await toggleBlockConversation(activeConversation.id, firebaseUser.uid, blockedByMe);
    notify({
      tone: 'info',
      title: blockedByMe ? 'Conversation unblocked' : 'User blocked in this conversation',
    });
  }

  if (loadingConvs) {
    return <LoadingSkeleton className="h-[520px] w-full" />;
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-6 w-6" />}
        title="No conversations yet"
        description="Conversations open automatically when you message a professional, discuss a proposal, or confirm a booking."
      />
    );
  }

  const otherParticipantId = activeConversation?.participantIds.find(
    (id) => id !== firebaseUser?.uid
  );
  const otherMeta = otherParticipantId
    ? activeConversation?.participantMeta?.[otherParticipantId]
    : null;
  const blockedByMe = Boolean(
    firebaseUser && activeConversation?.blockedBy.includes(firebaseUser.uid)
  );
  const isBlocked = (activeConversation?.blockedBy.length ?? 0) > 0;

  return (
    <Card className="overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
      {/* Conversation List */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#E9E5EF] flex flex-col">
        <div className="p-3 border-b border-[#E9E5EF]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6879]" />
            <input
              type="text"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full h-9 rounded-xl border border-[#E9E5EF] bg-[#FFFCF8] pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E9E5EF]/60">
          {filteredConversations.map((conv) => {
            const partnerId = conv.participantIds.find((id) => id !== firebaseUser?.uid);
            const partner = partnerId ? conv.participantMeta?.[partnerId] : null;
            const unread = firebaseUser ? conv.unreadCountByUser?.[firebaseUser.uid] ?? 0 : 0;
            const isActive = conv.id === activeConversation?.id;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  setSelectedId(conv.id);
                  setMessageLimit(40);
                }}
                className={cn(
                  'w-full p-3.5 text-left transition-colors cursor-pointer',
                  isActive ? 'bg-[#F5F0FF]' : 'hover:bg-[#FFFCF8]'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#242331] truncate">
                    {partner?.displayName || 'Conversation'}
                  </p>
                  <span className="text-[10px] text-[#6B6879] shrink-0">
                    {formatRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#5B3EB5] truncate mt-0.5">
                  {conv.subjectTitle}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-[#6B6879] truncate">
                    {conv.lastMessageText || 'No messages yet'}
                  </p>
                  {unread > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7655D9] px-1.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Thread */}
      <div className="md:col-span-8 flex flex-col bg-[#FFFCF8]">
        {activeConversation ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E5EF] bg-white px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#242331]">
                    {otherMeta?.displayName || 'VEYRA Participant'}
                  </h2>
                  <Badge tone="lavender" className="capitalize">
                    {activeConversation.type}
                  </Badge>
                </div>
                <p className="text-xs text-[#6B6879]">{activeConversation.subjectTitle}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBlockToggle}>
                  <Ban className="h-3.5 w-3.5" />
                  {blockedByMe ? 'Unblock' : 'Block'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
                  <Flag className="h-3.5 w-3.5" />
                  Report
                </Button>
              </div>
            </div>

            <div className="bg-[#F5F0FF]/70 border-b border-[#E9E5EF] px-4 py-1.5 text-[11px] text-[#5B3EB5] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Keep communication on VEYRA. Personal phone numbers and addresses remain private until confirmed booking.
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
              {visibleMessages.length >= messageLimit && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessageLimit((prev) => prev + 40)}
                  >
                    Load earlier messages
                  </Button>
                </div>
              )}

              {visibleMessages.map((msg) => {
                const isMine = msg.senderId === firebaseUser?.uid;
                if (msg.moderationStatus === 'removed') {
                  return (
                    <div
                      key={msg.id}
                      className="text-center text-xs italic text-[#6B6879] py-1"
                    >
                      [Message removed by moderation]
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn('flex flex-col max-w-[82%]', isMine ? 'ml-auto items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs space-y-2',
                        isMine
                          ? 'bg-[#7655D9] text-white rounded-br-sm'
                          : 'bg-white border border-[#E9E5EF] text-[#242331] rounded-bl-sm'
                      )}
                    >
                      {msg.attachments?.map((att, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={att.url}
                          alt={att.name}
                          className="max-h-56 rounded-xl object-cover"
                        />
                      ))}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                    <span className="mt-1 text-[10px] text-[#6B6879]">
                      {formatRelativeTime(msg.createdAt)}
                      {isMine && msg.readBy.length > 1 ? ' • Read' : ''}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {isBlocked ? (
              <div className="border-t border-[#E9E5EF] bg-[#FFF0F3] p-3 text-center text-xs text-rose-700">
                Messaging is paused because this conversation has been blocked.
              </div>
            ) : (
              <form
                onSubmit={handleSendText}
                className="border-t border-[#E9E5EF] bg-white p-3 flex items-center gap-2"
              >
                <label className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9E5EF] text-[#6B6879] hover:text-[#7655D9] cursor-pointer shrink-0">
                  <ImageIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAttachmentUpload}
                    disabled={uploadingImg}
                    className="sr-only"
                  />
                </label>
                <input
                  type="text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={uploadingImg ? 'Uploading image...' : 'Write a message...'}
                  className="flex-1 h-10 rounded-xl border border-[#E9E5EF] bg-[#FFFCF8] px-3.5 text-sm"
                />
                <Button type="submit" size="sm" loading={sending || uploadingImg}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#6B6879]">
            Select a conversation to view messages.
          </div>
        )}
      </div>

      {activeConversation && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="conversation"
          targetId={activeConversation.id}
          targetLabel="conversation"
        />
      )}
    </Card>
  );
}

export function MessagingWorkspace() {
  return (
    <React.Suspense fallback={<LoadingSkeleton className="h-[520px]" />}>
      <MessagingWorkspaceInner />
    </React.Suspense>
  );
}
