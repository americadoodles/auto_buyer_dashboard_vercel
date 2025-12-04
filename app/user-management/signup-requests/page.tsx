import { AdminUserManagement } from "components/organisms/AdminUserManagement";

export default function SignupRequestsPage() {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Signup Requests</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Review and approve new user registration requests from buyers.
        </p>
      </div>
      <AdminUserManagement />
    </div>
  );
}
