import MainLayout from '@/components/MainLayout';

export default function DashboardsPage() {
  return (
    <MainLayout
      leftSidebar={
        <div className="p-4">
          <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors mb-4">
            + New Dashboard
          </button>
          <div className="space-y-1">
            <div className="px-3 py-2 text-sm font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md">
              My Dashboard
            </div>
            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
              Analytics Overview
            </div>
            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
              User Metrics
            </div>
          </div>
        </div>
      }
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          My Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Widget Placeholder
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Dashboard widgets will be displayed here
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
