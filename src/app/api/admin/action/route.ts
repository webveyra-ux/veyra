import { z } from 'zod';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES } from '@/config/categories-seed';
import { ADMIN_LEVEL_PERMISSIONS } from '@/config/design-tokens';
import {
  getAdminAuth,
  getAdminDb,
  HttpError,
  toErrorResponse,
  verifyAdminAuth,
} from '@/lib/firebase/admin';
import {
  createServerNotification,
  recomputeProfessionalRating,
  writeServerAuditLog,
} from '@/services/server/marketplace';
import type { AdminLevel, AdminPermission, VerificationRecord } from '@/types/domain';

const adminActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('verify_professional'),
    uid: z.string().min(1),
    decision: z.enum(['approved', 'rejected', 'more_info_required', 'suspended']),
    note: z.string().trim().max(600).optional(),
  }),
  z.object({
    action: z.literal('set_user_status'),
    uid: z.string().min(1),
    accountStatus: z.enum(['active', 'suspended']),
    reason: z.string().trim().max(400).optional(),
  }),
  z.object({
    action: z.literal('feature_professional'),
    uid: z.string().min(1),
    isFeatured: z.boolean(),
  }),
  z.object({
    action: z.literal('moderate_review'),
    reviewId: z.string().min(1),
    moderationStatus: z.enum(['published', 'hidden', 'removed']),
    reason: z.string().trim().max(400).optional(),
  }),
  z.object({
    action: z.literal('resolve_report'),
    reportId: z.string().min(1),
    status: z.enum(['under_review', 'resolved', 'rejected', 'escalated']),
    resolutionNote: z.string().trim().max(600).optional(),
  }),
  z.object({
    action: z.literal('moderate_request'),
    requestId: z.string().min(1),
    mode: z.enum(['flag', 'unflag', 'close']),
  }),
  z.object({
    action: z.literal('assign_admin_role'),
    targetEmail: z.string().email(),
    adminLevel: z.enum([
      'super_admin',
      'operations_admin',
      'verification_admin',
      'support_admin',
      'content_admin',
    ]),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal('seed_categories'),
  }),
]);

function getRequiredPermission(action: z.infer<typeof adminActionSchema>['action']): AdminPermission {
  switch (action) {
    case 'verify_professional':
      return 'verify_professionals';
    case 'set_user_status':
      return 'manage_users';
    case 'feature_professional':
      return 'manage_content';
    case 'moderate_review':
      return 'moderate_reviews';
    case 'resolve_report':
      return 'manage_reports';
    case 'moderate_request':
      return 'manage_requests';
    case 'assign_admin_role':
      return 'manage_admin_roles';
    case 'seed_categories':
      return 'manage_categories';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Invalid admin action.');
    }

    const data = parsed.data;
    const adminCtx = await verifyAdminAuth(request, getRequiredPermission(data.action));
    const db = getAdminDb();
    const now = new Date().toISOString();
    const adminEmail = adminCtx.token.email || adminCtx.uid;

    switch (data.action) {
      case 'verify_professional': {
        const verifRef = db.collection('verificationRecords').doc(data.uid);
        const proRef = db.collection('professionalProfiles').doc(data.uid);
        const verifSnap = await verifRef.get();
        const existing = verifSnap.exists ? (verifSnap.data() as VerificationRecord) : null;
        const prevStatus = existing?.status ?? 'not_submitted';

        const historyEntry = {
          status: data.decision,
          note: data.note || `Decision updated to ${data.decision} by admin.`,
          actorId: adminCtx.uid,
          timestamp: now,
        };

        await verifRef.set(
          {
            uid: data.uid,
            status: data.decision,
            reviewedAt: now,
            reviewedBy: adminCtx.uid,
            reviewerNotes: data.note || null,
            rejectionReason: data.decision === 'rejected' ? data.note || 'Criteria not met' : null,
            history: [...(existing?.history ?? []), historyEntry],
          },
          { merge: true }
        );

        await proRef.set(
          {
            verificationStatus: data.decision,
            isVerified: data.decision === 'approved',
            updatedAt: now,
          },
          { merge: true }
        );

        await Promise.all([
          createServerNotification(db, {
            userId: data.uid,
            type: 'verification_update',
            title: `Verification status: ${data.decision.replace(/_/g, ' ')}`,
            message:
              data.note ||
              (data.decision === 'approved'
                ? 'Your VEYRA verified professional badge is now active.'
                : 'Please review your verification details in your dashboard.'),
            relatedEntityId: data.uid,
            relatedEntityType: 'verification',
            actionUrl: '/professional/verification',
          }),
          writeServerAuditLog(db, {
            action: 'verify_professional',
            adminId: adminCtx.uid,
            adminEmail,
            affectedEntity: 'verificationRecord',
            affectedEntityId: data.uid,
            beforeSummary: prevStatus,
            afterSummary: data.decision,
            details: data.note || `Updated verification status to ${data.decision}`,
          }),
        ]);
        break;
      }

      case 'set_user_status': {
        if (data.uid === adminCtx.uid && data.accountStatus === 'suspended') {
          throw new HttpError(400, 'You cannot suspend your own administrator account.');
        }

        const userRef = db.collection('users').doc(data.uid);
        const userSnap = await userRef.get();
        const prevStatus = userSnap.exists ? userSnap.data()?.accountStatus : 'unknown';

        await userRef.update({ accountStatus: data.accountStatus, updatedAt: now });
        await db
          .collection('professionalProfiles')
          .doc(data.uid)
          .update({
            profileStatus: data.accountStatus === 'suspended' ? 'suspended' : 'active',
            updatedAt: now,
          })
          .catch(() => undefined);

        await getAdminAuth()
          .updateUser(data.uid, { disabled: data.accountStatus === 'suspended' })
          .catch(() => undefined);

        await writeServerAuditLog(db, {
          action: 'set_user_status',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'user',
          affectedEntityId: data.uid,
          beforeSummary: String(prevStatus),
          afterSummary: data.accountStatus,
          details: data.reason || `Account status changed to ${data.accountStatus}`,
        });
        break;
      }

      case 'feature_professional': {
        await db.collection('professionalProfiles').doc(data.uid).update({
          isFeatured: data.isFeatured,
          updatedAt: now,
        });
        await writeServerAuditLog(db, {
          action: 'feature_professional',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'professionalProfile',
          affectedEntityId: data.uid,
          afterSummary: `isFeatured=${data.isFeatured}`,
          details: `Updated featured placement to ${data.isFeatured}`,
        });
        break;
      }

      case 'moderate_review': {
        const revRef = db.collection('reviews').doc(data.reviewId);
        const revSnap = await revRef.get();
        if (!revSnap.exists) throw new HttpError(404, 'Review not found.');
        const proId = revSnap.data()?.professionalId as string;

        await revRef.update({
          moderationStatus: data.moderationStatus,
          moderationReason: data.reason || null,
          updatedAt: now,
        });

        await recomputeProfessionalRating(db, proId);
        await writeServerAuditLog(db, {
          action: 'moderate_review',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'review',
          affectedEntityId: data.reviewId,
          afterSummary: data.moderationStatus,
          details: data.reason || `Review moderation set to ${data.moderationStatus}`,
        });
        break;
      }

      case 'resolve_report': {
        await db.collection('reports').doc(data.reportId).update({
          status: data.status,
          assignedAdminId: adminCtx.uid,
          resolutionNote: data.resolutionNote || null,
          updatedAt: now,
        });
        await writeServerAuditLog(db, {
          action: 'resolve_report',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'report',
          affectedEntityId: data.reportId,
          afterSummary: data.status,
          details: data.resolutionNote || `Report updated to ${data.status}`,
        });
        break;
      }

      case 'moderate_request': {
        const updatePayload: Record<string, unknown> = { updatedAt: now };
        if (data.mode === 'flag') updatePayload.isFlagged = true;
        if (data.mode === 'unflag') updatePayload.isFlagged = false;
        if (data.mode === 'close') updatePayload.status = 'closed';

        await db.collection('requests').doc(data.requestId).update(updatePayload);
        await writeServerAuditLog(db, {
          action: 'moderate_request',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'request',
          affectedEntityId: data.requestId,
          afterSummary: data.mode,
          details: `Request moderation action: ${data.mode}`,
        });
        break;
      }

      case 'assign_admin_role': {
        if (adminCtx.adminLevel !== 'super_admin') {
          throw new HttpError(403, 'Only a Super Admin can modify administrative roles.');
        }

        const authUser = await getAdminAuth().getUserByEmail(data.targetEmail);
        if (authUser.uid === adminCtx.uid && !data.active) {
          throw new HttpError(400, 'Cannot deactivate your own Super Admin role.');
        }

        const level: AdminLevel = data.adminLevel;
        const permissions = [...ADMIN_LEVEL_PERMISSIONS[level]];

        await getAdminAuth().setCustomUserClaims(
          authUser.uid,
          data.active ? { admin: true, adminLevel: level } : { admin: false, adminLevel: null }
        );

        await db.collection('adminRoles').doc(authUser.uid).set({
          uid: authUser.uid,
          email: authUser.email || data.targetEmail,
          displayName: authUser.displayName || data.targetEmail,
          adminLevel: level,
          permissions,
          active: data.active,
          assignedBy: adminCtx.uid,
          createdAt: now,
          updatedAt: now,
        });

        await db
          .collection('users')
          .doc(authUser.uid)
          .set(
            {
              uid: authUser.uid,
              role: data.active ? 'admin' : 'customer',
              displayName: authUser.displayName || data.targetEmail,
              email: authUser.email || data.targetEmail,
              accountStatus: 'active',
              updatedAt: now,
            },
            { merge: true }
          );

        await writeServerAuditLog(db, {
          action: 'assign_admin_role',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'adminRole',
          affectedEntityId: authUser.uid,
          afterSummary: `${level} (active=${data.active})`,
          details: `Updated admin role for ${data.targetEmail}`,
        });
        break;
      }

      case 'seed_categories': {
        const batch = db.batch();
        for (const cat of INITIAL_CATEGORIES) {
          batch.set(db.collection('categories').doc(cat.id), cat, { merge: true });
        }
        for (const sub of INITIAL_SUBCATEGORIES) {
          batch.set(db.collection('subcategories').doc(sub.id), sub, { merge: true });
        }
        await batch.commit();

        await writeServerAuditLog(db, {
          action: 'seed_categories',
          adminId: adminCtx.uid,
          adminEmail,
          affectedEntity: 'categories',
          affectedEntityId: 'initial_catalog',
          details: `Seeded ${INITIAL_CATEGORIES.length} categories and ${INITIAL_SUBCATEGORIES.length} subcategories.`,
        });
        break;
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
