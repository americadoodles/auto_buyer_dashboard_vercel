
import CurrentUsersTable from "components/organisms/CurrentUsersTable";

export default function AdminUserManagementPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Current Users</h1>
      <p>View and manage all registered users here.</p>
  <CurrentUsersTable />
    </div>
  );
}
