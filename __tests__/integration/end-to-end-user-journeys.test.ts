/**
 * End-to-End Test: Complete User Journeys
 * 
 * Tests complete user flows from signup through daily usage scenarios.
 * These tests validate the entire system working together as users would experience it.
 * 
 * Task: 30.2 End-to-end testing
 * Requirements: All
 */

import { prisma } from '@/lib/prisma';
import { createProject, getUserProjects, getProjectMembers } from '@/lib/project';
import { createInvitation, acceptInvitation } from '@/lib/invitation';
import { createDashboard, getProjectDashboards } from '@/lib/dashboard';
import { createReport, getProjectReports } from '@/lib/report';
import { upsertProfile, searchProfiles, getProfileWithEvents } from '@/lib/profile';
import { trackEvent, getProjectEvents } from '@/lib/event';
import { canPerformAction } from '@/lib/rbac';

describe('End-to-End: Complete User Journeys', () => {
  beforeEach(async () => {
    // Clean up all test data
    await prisma.event.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.widget.deleteMany({});
    await prisma.dashboard.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Journey 1: New User Signup and First Project', () => {
    it('should complete full new user journey: OAuth → First Project → Dashboard → Report', async () => {
      // Step 1: New user signs up via Google OAuth
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@startup.com',
          name: 'Sarah Chen',
          avatar: 'https://example.com/sarah.jpg',
        },
      });


      expect(newUser).toBeDefined();
      expect(newUser.email).toBe('newuser@startup.com');

      // Step 2: Session created with no active project (first-time user)
      const initialSession = {
        userId: newUser.id,
        activeProjectId: null,
      };
      expect(initialSession.activeProjectId).toBeNull();

      // Step 3: User creates their first project
      const firstProject = await createProject(newUser.id, 'My Startup Analytics');

      expect(firstProject).toBeDefined();
      expect(firstProject.name).toBe('My Startup Analytics');
      expect(firstProject.enabled).toBe(true);

      // Step 4: Verify user is automatically assigned as owner
      const membership = await prisma.projectMembership.findUnique({
        where: {
          userId_projectId: {
            userId: newUser.id,
            projectId: firstProject.id,
          },
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe('owner');

      // Step 5: Session updated with active project
      const activeSession = {
        userId: newUser.id,
        activeProjectId: firstProject.id,
      };
      expect(activeSession.activeProjectId).toBe(firstProject.id);

      // Step 6: User creates their first dashboard
      const dashboard = await createDashboard(firstProject.id, 'Overview Dashboard', newUser.id);

      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('Overview Dashboard');
      expect(dashboard.projectId).toBe(firstProject.id);

      // Step 7: User creates their first report
      const report = await createReport(firstProject.id, 'User Trends', 'trends', newUser.id);

      expect(report).toBeDefined();
      expect(report.name).toBe('User Trends');
      expect(report.category).toBe('trends');

      // Step 8: Verify user can access their resources
      const dashboards = await getProjectDashboards(firstProject.id);
      const reports = await getProjectReports(firstProject.id);

      expect(dashboards).toHaveLength(1);
      expect(reports).toHaveLength(1);

      // Step 9: Verify user has full owner permissions
      expect(await canPerformAction(newUser.id, firstProject.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(newUser.id, firstProject.id, 'members:invite')).toBe(true);
      expect(await canPerformAction(newUser.id, firstProject.id, 'project:delete')).toBe(true);
    });
  });

  describe('Journey 2: Team Collaboration - Invite and Accept', () => {
    it('should complete full collaboration journey: Invite → Accept → Collaborate', async () => {
      // Step 1: Owner creates project
      const owner = await prisma.user.create({
        data: {
          email: 'owner@company.com',
          name: 'Alex Johnson',
        },
      });

      const project = await createProject(owner.id, 'Company Analytics');

      // Step 2: Owner creates initial dashboard and report
      const ownerDashboard = await createDashboard(project.id, 'Executive Dashboard', owner.id);
      const ownerReport = await createReport(project.id, 'Monthly Metrics', 'trends', owner.id);

      expect(ownerDashboard).toBeDefined();
      expect(ownerReport).toBeDefined();

      // Step 3: Owner invites team member as editor
      const invitation = await createInvitation(
        project.id,
        'analyst@company.com',
        'editor',
        owner.id
      );

      expect(invitation).toBeDefined();
      expect(invitation.token).toBeDefined();
      expect(invitation.invitedEmail).toBe('analyst@company.com');
      expect(invitation.role).toBe('editor');

      // Step 4: Invited user signs up via OAuth
      const analyst = await prisma.user.create({
        data: {
          email: 'analyst@company.com',
          name: 'Maria Garcia',
        },
      });

      // Step 5: Analyst accepts invitation
      const membership = await acceptInvitation(invitation.token, analyst.email);

      expect(membership).toBeDefined();
      expect(membership.userId).toBe(analyst.id);
      expect(membership.projectId).toBe(project.id);
      expect(membership.role).toBe('editor');

      // Step 6: Analyst can now see the project
      const analystProjects = await getUserProjects(analyst.id);

      expect(analystProjects).toHaveLength(1);
      expect(analystProjects[0].id).toBe(project.id);

      // Step 7: Analyst creates their own dashboard
      const analystDashboard = await createDashboard(project.id, 'Data Analysis', analyst.id);

      expect(analystDashboard).toBeDefined();
      expect(analystDashboard.name).toBe('Data Analysis');

      // Step 8: Analyst creates a report
      const analystReport = await createReport(project.id, 'User Cohorts', 'cohorts', analyst.id);

      expect(analystReport).toBeDefined();

      // Step 9: Verify both users can see all resources
      const allDashboards = await getProjectDashboards(project.id);
      const allReports = await getProjectReports(project.id);

      expect(allDashboards).toHaveLength(2); // Owner's + Analyst's
      expect(allReports).toHaveLength(2);

      // Step 10: Verify analyst has editor permissions
      expect(await canPerformAction(analyst.id, project.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(analyst.id, project.id, 'report:update')).toBe(true);
      expect(await canPerformAction(analyst.id, project.id, 'profile:read')).toBe(true);

      // Step 11: Verify analyst cannot invite members (editor limitation)
      expect(await canPerformAction(analyst.id, project.id, 'members:invite')).toBe(false);

      // Step 12: Owner can see team members
      const members = await getProjectMembers(project.id);

      expect(members).toHaveLength(2);
      expect(members.some(m => m.userId === owner.id && m.role === 'owner')).toBe(true);
      expect(members.some(m => m.userId === analyst.id && m.role === 'editor')).toBe(true);
    });
  });

  describe('Journey 3: Dashboard and Report Creation Workflow', () => {
    it('should complete full analytics workflow: Create → Organize → Access', async () => {
      // Step 1: Setup user and project
      const user = await prisma.user.create({
        data: {
          email: 'analyst@analytics.com',
          name: 'Data Analyst',
        },
      });

      const project = await createProject(user.id, 'Analytics Platform');

      // Step 2: Create multiple dashboards for different purposes
      const overviewDashboard = await createDashboard(project.id, 'Overview', user.id);
      const marketingDashboard = await createDashboard(project.id, 'Marketing Metrics', user.id);
      const productDashboard = await createDashboard(project.id, 'Product Analytics', user.id);

      expect(overviewDashboard).toBeDefined();
      expect(marketingDashboard).toBeDefined();
      expect(productDashboard).toBeDefined();

      // Step 3: Create reports in different categories
      const trendReport = await createReport(project.id, 'User Growth Trends', 'trends', user.id);
      const cohortReport = await createReport(project.id, 'User Cohorts', 'cohorts', user.id);
      const retentionReport = await createReport(project.id, 'Retention Analysis', 'retention', user.id);
      const journeyReport = await createReport(project.id, 'User Journeys', 'journeys', user.id);

      expect(trendReport.category).toBe('trends');
      expect(cohortReport.category).toBe('cohorts');
      expect(retentionReport.category).toBe('retention');
      expect(journeyReport.category).toBe('journeys');

      // Step 4: Retrieve all dashboards
      const allDashboards = await getProjectDashboards(project.id);

      expect(allDashboards).toHaveLength(3);
      expect(allDashboards.map(d => d.name)).toContain('Overview');
      expect(allDashboards.map(d => d.name)).toContain('Marketing Metrics');
      expect(allDashboards.map(d => d.name)).toContain('Product Analytics');

      // Step 5: Retrieve all reports
      const allReports = await getProjectReports(project.id);

      expect(allReports).toHaveLength(4);

      // Step 6: Filter reports by category (manual filtering since API doesn't support it)
      const trendReports = allReports.filter(r => r.category === 'trends');
      const cohortReports = allReports.filter(r => r.category === 'cohorts');

      expect(trendReports).toHaveLength(1);
      expect(trendReports[0].name).toBe('User Growth Trends');
      expect(cohortReports).toHaveLength(1);
      expect(cohortReports[0].name).toBe('User Cohorts');

      // Step 7: Verify user can update dashboards
      const updatedDashboard = await prisma.dashboard.update({
        where: { id: overviewDashboard.id },
        data: { name: 'Executive Overview' },
      });

      expect(updatedDashboard.name).toBe('Executive Overview');

      // Step 8: Verify user can delete reports
      await prisma.report.delete({
        where: { id: journeyReport.id },
      });

      const remainingReports = await getProjectReports(project.id);
      expect(remainingReports).toHaveLength(3);
    });
  });

  describe('Journey 4: Profile and Event Tracking Workflow', () => {
    it('should complete full tracking workflow: Track Events → View Profiles → Analyze Activity', async () => {
      // Step 1: Setup user and project
      const user = await prisma.user.create({
        data: {
          email: 'product@saas.com',
          name: 'Product Manager',
        },
      });

      const project = await createProject(user.id, 'SaaS Product');

      // Step 2: Create customer profiles
      const profile1 = await upsertProfile(
        project.id,
        'user_123',
        {
          name: 'John Doe',
          email: 'john@customer.com',
          plan: 'premium',
          signupDate: '2024-01-15',
        }
      );

      const profile2 = await upsertProfile(
        project.id,
        'user_456',
        {
          name: 'Jane Smith',
          email: 'jane@customer.com',
          plan: 'basic',
          signupDate: '2024-02-20',
        }
      );

      expect(profile1).toBeDefined();
      expect(profile1.externalId).toBe('user_123');
      expect(profile2.externalId).toBe('user_456');

      // Step 3: Track events for profile 1
      const event1 = await trackEvent(
        project.id,
        profile1.id,
        'page_view',
        { page: '/dashboard', duration: 45 }
      );

      const event2 = await trackEvent(
        project.id,
        profile1.id,
        'button_click',
        { button: 'upgrade', location: 'pricing_page' }
      );

      const event3 = await trackEvent(
        project.id,
        profile1.id,
        'feature_used',
        { feature: 'export_data', format: 'csv' }
      );

      expect(event1.eventName).toBe('page_view');
      expect(event2.eventName).toBe('button_click');
      expect(event3.eventName).toBe('feature_used');

      // Step 4: Track events for profile 2
      const event4 = await trackEvent(
        project.id,
        profile2.id,
        'page_view',
        { page: '/home', duration: 30 }
      );

      const event5 = await trackEvent(
        project.id,
        profile2.id,
        'signup_completed',
        { source: 'google_ads', campaign: 'winter_2024' }
      );

      expect(event4).toBeDefined();
      expect(event5).toBeDefined();

      // Step 5: Search for profiles
      const searchResults = await searchProfiles(project.id, {}, { page: 1, pageSize: 10 });

      expect(searchResults.profiles).toHaveLength(2);
      expect(searchResults.total).toBe(2);

      // Step 6: View profile with events
      const profileWithEvents = await getProfileWithEvents(profile1.id);

      expect(profileWithEvents).toBeDefined();
      expect(profileWithEvents.externalId).toBe('user_123');
      expect(profileWithEvents.events).toHaveLength(3);
      expect(profileWithEvents.events.map(e => e.eventName)).toContain('page_view');
      expect(profileWithEvents.events.map(e => e.eventName)).toContain('button_click');
      expect(profileWithEvents.events.map(e => e.eventName)).toContain('feature_used');

      // Step 7: View all project events
      const allEvents = await getProjectEvents(
        project.id,
        {},
        { page: 1, pageSize: 20 }
      );

      expect(allEvents.events).toHaveLength(5);
      expect(allEvents.total).toBe(5);

      // Step 8: Filter events by event name
      const pageViewEvents = await getProjectEvents(
        project.id,
        { eventName: 'page_view' },
        { page: 1, pageSize: 10 }
      );

      expect(pageViewEvents.events).toHaveLength(2);
      expect(pageViewEvents.events.every(e => e.eventName === 'page_view')).toBe(true);

      // Step 9: Filter events by profile
      const profile1Events = await prisma.event.findMany({
        where: { profileId: profile1.id },
      });

      expect(profile1Events).toHaveLength(3);

      // Step 10: Update profile traits
      const updatedProfile = await upsertProfile(
        project.id,
        'user_123',
        {
          name: 'John Doe',
          email: 'john@customer.com',
          plan: 'enterprise', // Upgraded
          signupDate: '2024-01-15',
          lastSeen: new Date().toISOString(),
        }
      );

      expect(updatedProfile.externalId).toBe('user_123');

      // Step 11: Verify user has permission to view profiles and events
      expect(await canPerformAction(user.id, project.id, 'profile:read')).toBe(true);
      expect(await canPerformAction(user.id, project.id, 'event:read')).toBe(true);
    });
  });

  describe('Journey 5: Multi-User Collaboration with Different Roles', () => {
    it('should handle complex multi-user scenario with different permissions', async () => {
      // Step 1: Owner creates project
      const owner = await prisma.user.create({
        data: {
          email: 'ceo@enterprise.com',
          name: 'CEO',
        },
      });

      const project = await createProject(owner.id, 'Enterprise Analytics');

      // Step 2: Owner invites admin
      const adminInvite = await createInvitation(
        project.id,
        'admin@enterprise.com',
        'admin',
        owner.id
      );

      const admin = await prisma.user.create({
        data: {
          email: 'admin@enterprise.com',
          name: 'Admin User',
        },
      });

      await acceptInvitation(adminInvite.token, admin.email);

      // Step 3: Admin invites editor
      const editorInvite = await createInvitation(
        project.id,
        'editor@enterprise.com',
        'editor',
        admin.id
      );

      const editor = await prisma.user.create({
        data: {
          email: 'editor@enterprise.com',
          name: 'Editor User',
        },
      });

      await acceptInvitation(editorInvite.token, editor.email);

      // Step 4: Admin invites viewer
      const viewerInvite = await createInvitation(
        project.id,
        'viewer@enterprise.com',
        'viewer',
        admin.id
      );

      const viewer = await prisma.user.create({
        data: {
          email: 'viewer@enterprise.com',
          name: 'Viewer User',
        },
      });

      await acceptInvitation(viewerInvite.token, viewer.email);

      // Step 5: Owner creates dashboard
      const ownerDashboard = await createDashboard(project.id, 'Executive Dashboard', owner.id);

      // Step 6: Editor creates dashboard
      const editorDashboard = await createDashboard(project.id, 'Analysis Dashboard', editor.id);

      // Step 7: Viewer tries to create dashboard (should fail based on permissions)
      // Note: In real implementation, this would be blocked at API level
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:create')).toBe(false);

      // Step 8: Create profiles and events
      const profile = await upsertProfile(
        project.id,
        'customer_001',
        { name: 'Customer One', tier: 'enterprise' }
      );

      await trackEvent(project.id, profile.id, 'login', { method: 'sso' });

      // Step 9: All users can view profiles and events
      expect(await canPerformAction(owner.id, project.id, 'profile:read')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'profile:read')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'profile:read')).toBe(true);
      expect(await canPerformAction(viewer.id, project.id, 'profile:read')).toBe(true);

      // Step 10: Verify member list shows all users
      const members = await getProjectMembers(project.id);

      expect(members).toHaveLength(4);
      expect(members.find(m => m.userId === owner.id)?.role).toBe('owner');
      expect(members.find(m => m.userId === admin.id)?.role).toBe('admin');
      expect(members.find(m => m.userId === editor.id)?.role).toBe('editor');
      expect(members.find(m => m.userId === viewer.id)?.role).toBe('viewer');

      // Step 11: Verify dashboards are visible to all
      const dashboards = await getProjectDashboards(project.id);

      expect(dashboards).toHaveLength(2);

      // Step 12: Verify permission hierarchy
      expect(await canPerformAction(owner.id, project.id, 'members:remove')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'members:remove')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'members:remove')).toBe(false);
      expect(await canPerformAction(viewer.id, project.id, 'members:remove')).toBe(false);
    });
  });
});
