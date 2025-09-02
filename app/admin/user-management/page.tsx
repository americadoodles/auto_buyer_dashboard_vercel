
import CurrentUsersTable from "components/organisms/CurrentUsersTable";

export default function AdminUserManagementPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Current Users</h1>
        <p className="text-gray-600 mt-2">
          View and manage all registered users in your application.
        </p>
      </div>
      <CurrentUsersTable />
    </div>
  );
}
