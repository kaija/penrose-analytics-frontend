'use client';

import { UserWithMemberships } from './UserListSection';

interface UserDetailViewProps {
  user: UserWithMemberships;
  onClose: () => void;
}

export default function UserDetailView({ user, onClose }: UserDetailViewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          User Details
        </h3>
      </div>

      {/* User Information */}
      <div className="p-6 space-y-6">
        {/* Avatar and Basic Info */}
        <div className="flex items-start gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-3xl font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {user.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              ID: {user.id}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Created: {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Project Memberships */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Project Memberships
          </h4>

          {user.memberships.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                This user is not a member of any projects
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Project Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Member Since
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {user.memberships.map((membership) => (
                    <tr key={membership.projectId}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {membership.projectName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          membership.role === 'owner'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : membership.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : membership.role === 'editor'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {membership.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(membership.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
