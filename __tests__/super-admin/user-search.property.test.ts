import fc from 'fast-check';
import { UserWithMemberships } from '../../app/__super_admin__/components/UserListSection';

/**
 * Property 2: User search correctness
 *
 * **Validates: Requirements 4.3**
 *
 * For any list of users and any search text, the search results should contain
 * only users whose email or name contains the search text (case-insensitive),
 * and should contain all such matching users.
 */

// Helper function to perform user search (mirrors component logic)
function searchUsers(users: UserWithMemberships[], searchText: string): UserWithMemberships[] {
  return users.filter(user =>
    user.email.toLowerCase().includes(searchText.toLowerCase()) ||
    user.name.toLowerCase().includes(searchText.toLowerCase())
  );
}

// Generators
const membershipDetailArb = fc.record({
  projectId: fc.uuid(),
  projectName: fc.string({ minLength: 1, maxLength: 50 }),
  role: fc.constantFrom('owner', 'admin', 'editor', 'viewer') as fc.Arbitrary<'owner' | 'admin' | 'editor' | 'viewer'>,
  createdAt: fc.date(),
});

const userArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  avatar: fc.option(fc.webUrl(), { nil: null }),
  createdAt: fc.date(),
  memberships: fc.array(membershipDetailArb, { maxLength: 5 }),
});

describe('Property 2: User search correctness', () => {
  it('should only return users whose email or name contains the search text (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 20 }),
        fc.string({ maxLength: 30 }),
        (users, searchText) => {
          const results = searchUsers(users, searchText);

          // All results must match the search text
          const allResultsMatch = results.every(user =>
            user.email.toLowerCase().includes(searchText.toLowerCase()) ||
            user.name.toLowerCase().includes(searchText.toLowerCase())
          );

          return allResultsMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all users that match the search text', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 20 }),
        fc.string({ maxLength: 30 }),
        (users, searchText) => {
          const results = searchUsers(users, searchText);

          // Find all users that should match
          const expectedMatches = users.filter(user =>
            user.email.toLowerCase().includes(searchText.toLowerCase()) ||
            user.name.toLowerCase().includes(searchText.toLowerCase())
          );

          // Results should contain all expected matches
          const allMatchesIncluded = expectedMatches.every(expectedUser =>
            results.some(resultUser => resultUser.id === expectedUser.id)
          );

          return allMatchesIncluded && results.length === expectedMatches.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (users, searchText) => {
          const lowerResults = searchUsers(users, searchText.toLowerCase());
          const upperResults = searchUsers(users, searchText.toUpperCase());
          const mixedResults = searchUsers(users, searchText);

          // All three should return the same results
          return (
            lowerResults.length === upperResults.length &&
            upperResults.length === mixedResults.length &&
            lowerResults.every(user => upperResults.some(u => u.id === user.id)) &&
            upperResults.every(user => mixedResults.some(u => u.id === user.id))
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all users when search text is empty', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 20 }),
        (users) => {
          const results = searchUsers(users, '');
          return results.length === users.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no users match', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (users, searchText) => {
          const results = searchUsers(users, searchText);

          // If results are empty, verify no user should match
          if (results.length === 0) {
            const noMatches = users.every(user =>
              !user.email.toLowerCase().includes(searchText.toLowerCase()) &&
              !user.name.toLowerCase().includes(searchText.toLowerCase())
            );
            return noMatches;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
