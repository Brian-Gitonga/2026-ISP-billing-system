'use client';

export default function UsersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Active Users</h1>
        <p className="text-gray-400">View and manage active WiFi users</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400 mb-4">
          This feature requires integration with your MikroTik or TP-Link router API.
        </p>
        <p className="text-gray-500 text-sm">
          Configure your router API credentials to view active users.
        </p>
      </div>
    </div>
  );
}
