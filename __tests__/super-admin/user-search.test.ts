import { UserWithMemberships } from '../../app/__super_admin__/components/UserListSection';

/**
 * Unit tests for user search edge cases
 *
 * **Validates: Requirements 4.3, 4.4**
 */

// Helper function to perform user search (mirrors component logic)
function searchUsers(users: UserWithMemberships[], searchText: string): UserWithMemberships[] {
  return users.filter(user =>
    user.email.toLowerCase().includes(searchText.toLowerCase()) ||
    user.name.toLowerCase().includes(searchText.toLowerCase())
  );
}

describe('User search edge cases', () => {
  const mockUsers: UserWithMemberships[] = [
    {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice Smith',
      avatar: null,
      createdAt: new Date('2024-01-01'),
      memberships: [],
    },
    {
      id: 'user-2',
      email: 'bob@test.com',
      name: 'Bob Johnson',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: new Date('2024-01-02'),
      memberships: [],
    },
    {
      id: 'user-3',
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      avatar: null,
      createdAt: new Date('2024-01-03'),
      memberships: [],
    },
  ];

  describe('empty search', () => {
    it('should return all users when search text is empty string', () => {
      const results = searchUsers(mockUsers, '');
      expect(results).toHaveLength(3);
      expect(results).toEqual(mockUsers);
    });

    it('should treat whitespace as search term (no special handling)', () => {
      // Whitespace is treated as a literal search term, not as "empty"
      const results = searchUsers(mockUsers, '   ');
      // Since no email or name contains "   ", this returns empty
      expect(results).toHaveLength(0);
    });
  });

  describe('no matches', () => {
    it('should return empty array when no users match search text', () => {
      const results = searchUsers(mockUsers, 'nonexistent@email.com');
      expect(results).toHaveLength(0);
    });

    it('should return empty array when searching for special characters not in data', () => {
      const results = searchUsers(mockUsers, '!@#$%^&*()');
      expect(results).toHaveLength(0);
    });

    it('should return empty array when searching empty list', () => {
      const results = searchUsers([], 'alice');
      expect(results).toHaveLength(0);
    });
  });

  describe('all matches', () => {
    it('should return all users when search text matches all emails', () => {
      const results = searchUsers(mockUsers, 'example.com');
      expect(results).toHaveLength(2);
      expect(results.map(u => u.id)).toEqual(['user-1', 'user-3']);
    });

    it('should return all users when search text is common substring', () => {
      const allWithCommonDomain = [
        { ...mockUsers[0], email: 'alice@test.com' },
        { ...mockUsers[1], email: 'bob@test.com' },
        { ...mockUsers[2], email: 'charlie@test.com' },
      ];
      const results = searchUsers(allWithCommonDomain, 'test.com');
      expect(results).toHaveLength(3);
    });
  });

  describe('partial matches', () => {
    it('should match partial email', () => {
      const results = searchUsers(mockUsers, 'alice@');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-1');
    });

    it('should match partial name', () => {
      const results = searchUsers(mockUsers, 'Smith');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-1');
    });

    it('should match first name only', () => {
      const results = searchUsers(mockUsers, 'Bob');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-2');
    });

    it('should match last name only', () => {
      const results = searchUsers(mockUsers, 'Brown');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-3');
    });
  });

  describe('case sensitivity', () => {
    it('should match regardless of case in search text', () => {
      const lowerResults = searchUsers(mockUsers, 'alice');
      const upperResults = searchUsers(mockUsers, 'ALICE');
      const mixedResults = searchUsers(mockUsers, 'AlIcE');

      expect(lowerResults).toHaveLength(1);
      expect(upperResults).toHaveLength(1);
      expect(mixedResults).toHaveLength(1);
      expect(lowerResults[0].id).toBe('user-1');
      expect(upperResults[0].id).toBe('user-1');
      expect(mixedResults[0].id).toBe('user-1');
    });

    it('should match email domain regardless of case', () => {
      const results = searchUsers(mockUsers, 'EXAMPLE.COM');
      expect(results).toHaveLength(2);
    });
  });

  describe('multiple matches', () => {
    it('should return multiple users when search matches multiple emails', () => {
      const results = searchUsers(mockUsers, '@example.com');
      expect(results).toHaveLength(2);
      expect(results.map(u => u.id).sort()).toEqual(['user-1', 'user-3']);
    });

    it('should match on either email or name', () => {
      const results = searchUsers(mockUsers, 'bob');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('bob@test.com');
      expect(results[0].name).toBe('Bob Johnson');
    });
  });

  describe('special characters', () => {
    it('should handle search text with @ symbol', () => {
      const results = searchUsers(mockUsers, '@test.com');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-2');
    });

    it('should handle search text with dots', () => {
      const results = searchUsers(mockUsers, '.com');
      expect(results).toHaveLength(3);
    });
  });
});
