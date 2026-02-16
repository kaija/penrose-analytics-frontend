# Integration Tests

This directory contains comprehensive integration tests for the Prism CDP platform. These tests validate end-to-end user flows across multiple system components.

## Test Files

### 1. oauth-to-project-creation.test.ts
Tests the complete OAuth authentication through project creation flow.

**Scenarios Covered:**
- New user OAuth → User creation → Session → First project creation
- New user creating multiple projects
- Returning user OAuth → Session with active project
- Returning user with multiple projects
- Session persistence across project operations
- Error handling for duplicate emails and invalid data

**Requirements Validated:** 2.1-2.10, 3.1-3.4, 15.1-15.5

**Test Count:** 8 tests

### 2. invitation-acceptance-flow.test.ts
Tests the complete invitation lifecycle from creation through acceptance and member access.

**Scenarios Covered:**
- Full invitation flow: Create → Send → Accept → Access verification
- Multiple invitations to same project with different roles
- Role-based permissions after invitation acceptance (editor, viewer, admin)
- Invitation error cases (mismatched email, expired, already accepted)
- Admin invitation capabilities

**Requirements Validated:** 5.1-5.11, 17.1-17.6, 4.1-4.10

**Test Count:** 13 tests

### 3. project-switching-permissions.test.ts
Tests project switching functionality and permission enforcement across different project contexts.

**Scenarios Covered:**
- Basic project switching between user-owned projects
- Preventing unauthorized project access
- Switching to projects where user is a member
- Permission enforcement after switching (different roles in different projects)
- Owner permissions across all owned projects
- Multi-project scenarios with different roles
- Rapid project switching
- Session consistency during switches
- Error handling for invalid switches

**Requirements Validated:** 3.4-3.12, 4.1-4.10, 15.1-15.5

**Test Count:** 13 tests

### 4. super-admin-operations.test.ts
Tests super admin access control and cross-project administrative operations.

**Scenarios Covered:**
- Super admin access control (email allowlist, path verification, OAuth requirement)
- Project management (listing all projects, enable/disable, view details)
- User management (listing all users, viewing memberships)
- Membership management (listing, removing members, transferring ownership)
- Invitation management (viewing all invitations, regenerating tokens)
- Cross-project operations
- System-wide statistics
- Regular user restrictions

**Requirements Validated:** 13.1-13.13

**Test Count:** 13 tests

### 5. end-to-end-user-journeys.test.ts
Tests complete end-to-end user journeys from signup through daily usage scenarios.

**Scenarios Covered:**
- Journey 1: New user signup → First project → Dashboard → Report creation
- Journey 2: Team collaboration → Invite → Accept → Collaborate with different roles
- Journey 3: Dashboard and report creation workflow → Organize → Access
- Journey 4: Profile and event tracking → View profiles → Analyze activity
- Journey 5: Multi-user collaboration with different permission levels

**Requirements Validated:** All (comprehensive end-to-end validation)

**Test Count:** 5 tests

## Running the Tests

### Run all integration tests:
```bash
npm test -- __tests__/integration/
```

### Run a specific integration test file:
```bash
npm test -- __tests__/integration/oauth-to-project-creation.test.ts
```

### Run with coverage:
```bash
npm test -- __tests__/integration/ --coverage
```

## Test Environment

- **Test Environment:** Node.js (required for Prisma)
- **Database:** PostgreSQL (via Prisma)
- **Test Framework:** Jest
- **Test Type:** Integration tests (testing multiple components together)

## Key Features

### Database Cleanup
All tests include proper setup and teardown:
- `beforeEach`: Cleans up test data before each test
- `afterAll`: Disconnects from Prisma after all tests complete

### Real Database Operations
These tests use the actual Prisma client and database, not mocks. This ensures:
- Real database constraints are tested
- Actual transaction behavior is validated
- Foreign key relationships work correctly
- Unique constraints are enforced

### Comprehensive Coverage
The integration tests cover:
- ✅ Complete user flows from start to finish
- ✅ Multiple system components working together
- ✅ Permission enforcement across different contexts
- ✅ Error handling and edge cases
- ✅ Cross-project operations
- ✅ Role-based access control

## Test Results

All 52 integration tests pass successfully:
- OAuth to Project Creation: 8 tests ✅
- Invitation Acceptance Flow: 13 tests ✅
- Project Switching Permissions: 13 tests ✅
- Super Admin Operations: 13 tests ✅
- End-to-End User Journeys: 5 tests ✅

## Notes

### Session Handling
Integration tests simulate session data structures without using iron-session directly to avoid ES module compatibility issues. The session structure is validated but actual cookie management is tested separately in unit tests.

### Validation Testing
Some tests verify that the database allows certain operations (like empty strings) while noting that application-level validation should prevent these cases. This distinction is important for understanding where validation should occur.

### Environment Variables
Super admin tests require environment variables:
- `SUPER_ADMIN_PATH`: Secret path for super admin access
- `SUPER_ADMIN_EMAILS`: Comma-separated list of super admin emails

These are set in the test setup and restored after tests complete.
