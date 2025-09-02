import Link from 'next/link';

export const AdminNavPanel = () => (
  <nav className="h-full w-64 bg-gray-100 border-r flex flex-col p-4">
    <h2 className="text-lg font-bold mb-6">Admin Panel</h2>
    <ul className="space-y-4">
      <li>
        <Link href="/admin/user-management/signup-requests" className="text-blue-700 hover:underline">
          Signup Requests
        </Link>
      </li>
      <li>
        <Link href="/admin/user-management" className="text-blue-700 hover:underline">
          Current Users
        </Link>
      </li>
      <li>
        <Link href="/admin/user-management/roles" className="text-blue-700 hover:underline">
          Role Management
        </Link>
      </li>
    </ul>
  </nav>
);
