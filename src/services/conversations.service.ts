import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { ChatMessage, Conversation, MessageAttachment, UserRole } from '@/types/domain';

export function buildDeterministicConversationId(
  customerId: string,
  professionalId: string,
  requestId?: string | null
): string {
  const base = [customerId, professionalId].sort().join('_');
  return requestId ? `${base}_req_${requestId}` : `${base}_direct`;
}

export async function getOrCreateConversation(input: {
  customerId: string;
  professionalId: string;
  customerMeta: { displayName: string; photoURL: string | null; role: UserRole };
  professionalMeta: { displayName: string; photoURL: string | null; role: UserRole };
  type: Conversation['type'];
  subjectTitle: string;
  requestId?: string | null;
  proposalId?: string | null;
  bookingId?: string | null;
}): Promise<Conversation> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const id = buildDeterministicConversationId(
    input.customerId,
    input.professionalId,
    input.requestId
  );
  const ref = doc(services.db, 'conversations', id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return existing.data() as Conversation;
  }

  const now = new Date().toISOString();
  const conversation: Conversation = {
    id,
    type: input.type,
    participantIds: [input.customerId, input.professionalId],
    customerId: input.customerId,
    professionalId: input.professionalId,
    participantMeta: {
      [input.customerId]: input.customerMeta,
      [input.professionalId]: input.professionalMeta,
    },
    requestId: input.requestId ?? null,
    proposalId: input.proposalId ?? null,
    bookingId: input.bookingId ?? null,
    subjectTitle: input.subjectTitle,
    lastMessageText: '',
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCountByUser: {
      [input.customerId]: 0,
      [input.professionalId]: 0,
    },
    blockedBy: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, conversation);
  return conversation;
}

export function subscribeUserConversations(
  uid: string,
  onData: (conversations: Conversation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(services.db, 'conversations'),
    where('participantIds', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
    limit(40)
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Conversation));
    },
    (err) => {
      onError?.(err);
    }
  );
}

export function subscribeConversationMessages(
  conversationId: string,
  pageSize: number,
  onData: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(services.db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ChatMessage));
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function sendChatMessage(input: {
  conversation: Conversation;
  senderId: string;
  text: string;
  attachments?: MessageAttachment[];
}): Promise<ChatMessage> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  if (input.conversation.blockedBy.length > 0 || input.conversation.status !== 'active') {
    throw new Error('Messaging is currently disabled for this conversation.');
  }

  const now = new Date().toISOString();
  const msgRef = doc(collection(services.db, 'conversations', input.conversation.id, 'messages'));
  const message: ChatMessage = {
    id: msgRef.id,
    conversationId: input.conversation.id,
    senderId: input.senderId,
    type: input.attachments && input.attachments.length > 0 ? 'image' : 'text',
    text: input.text.trim(),
    attachments: input.attachments ?? [],
    readBy: [input.senderId],
    moderationStatus: 'visible',
    createdAt: now,
  };

  await setDoc(msgRef, message);

  const otherId = input.conversation.participantIds.find((id) => id !== input.senderId);
  const nextUnread = { ...input.conversation.unreadCountByUser };
  if (otherId) {
    nextUnread[otherId] = (nextUnread[otherId] ?? 0) + 1;
  }
  nextUnread[input.senderId] = 0;

  await updateDoc(doc(services.db, 'conversations', input.conversation.id), {
    lastMessageText: message.text || 'Sent an image attachment',
    lastMessageAt: now,
    lastMessageSenderId: input.senderId,
    unreadCountByUser: nextUnread,
    updatedAt: now,
  });

  return message;
}

export async function markConversationRead(conversation: Conversation, uid: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  if ((conversation.unreadCountByUser?.[uid] ?? 0) === 0) return;

  await updateDoc(doc(services.db, 'conversations', conversation.id), {
    [`unreadCountByUser.${uid}`]: 0,
  }).catch(() => undefined);

  const recentMsgs = await getDocs(
    query(
      collection(services.db, 'conversations', conversation.id, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(15)
    )
  ).catch(() => null);

  if (recentMsgs) {
    await Promise.all(
      recentMsgs.docs
        .filter((d) => !((d.data() as ChatMessage).readBy || []).includes(uid))
        .map((d) =>
          updateDoc(d.ref, {
            readBy: arrayUnion(uid),
          }).catch(() => undefined)
        )
    );
  }
}

export async function toggleBlockConversation(
  conversationId: string,
  uid: string,
  currentlyBlockedByMe: boolean
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  await updateDoc(doc(services.db, 'conversations', conversationId), {
    blockedBy: currentlyBlockedByMe ? arrayRemove(uid) : arrayUnion(uid),
    updatedAt: new Date().toISOString(),
  });
}
