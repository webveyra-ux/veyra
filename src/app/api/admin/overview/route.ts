import { getAdminDb, toErrorResponse, verifyAdminAuth } from '@/lib/firebase/admin';
import type {
  AdminRoleRecord,
  AuditLog,
  Booking,
  ModerationReport,
  ProfessionalProfile,
  Review,
  ServiceRequest,
  UserRecord,
  VerificationRecord,
} from '@/types/domain';

export async function GET(request: Request) {
  try {
    await verifyAdminAuth(request);
    const db = getAdminDb();

    const [
      usersSnap,
      prosSnap,
      verifsSnap,
      requestsSnap,
      proposalsCountSnap,
      bookingsSnap,
      reviewsSnap,
      reportsSnap,
      auditSnap,
      adminRolesSnap,
    ] = await Promise.all([
      db.collection('users').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('professionalProfiles').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('verificationRecords').limit(100).get(),
      db.collection('requests').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('proposals').count().get(),
      db.collection('bookings').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('reviews').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('reports').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('auditLogs').orderBy('createdAt', 'desc').limit(80).get(),
      db.collection('adminRoles').limit(50).get(),
    ]);

    const users = usersSnap.docs.map((d) => d.data() as UserRecord);
    const professionals = prosSnap.docs.map((d) => d.data() as ProfessionalProfile);
    const verifications = verifsSnap.docs.map((d) => d.data() as VerificationRecord);
    const requests = requestsSnap.docs.map((d) => d.data() as ServiceRequest);
    const bookings = bookingsSnap.docs.map((d) => d.data() as Booking);
    const reviews = reviewsSnap.docs.map((d) => d.data() as Review);
    const reports = reportsSnap.docs.map((d) => d.data() as ModerationReport);
    const auditLogs = auditSnap.docs.map((d) => d.data() as AuditLog);
    const adminRoles = adminRolesSnap.docs.map((d) => d.data() as AdminRoleRecord);

    const metrics = {
      totalUsers: users.length,
      totalCustomers: users.filter((u) => u.role === 'customer').length,
      totalProfessionals: professionals.length,
      verifiedProfessionals: professionals.filter((p) => p.isVerified).length,
      pendingVerifications: verifications.filter((v) => v.status === 'pending').length,
      activeRequests: requests.filter((r) =>
        ['open', 'matching', 'proposals_received', 'shortlisted'].includes(r.status)
      ).length,
      totalRequests: requests.length,
      totalProposals: proposalsCountSnap.data().count,
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === 'completed').length,
      cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
      openReports: reports.filter((r) => ['open', 'under_review', 'escalated'].includes(r.status)).length,
    };

    return Response.json({
      metrics,
      users,
      professionals,
      verifications,
      requests,
      bookings,
      reviews,
      reports,
      auditLogs,
      adminRoles,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
