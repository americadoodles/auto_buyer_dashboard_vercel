
import CurrentUsersTable from "components/organisms/CurrentUsersTable";
import { AdminLayout } from "../../../components/templates/AdminLayout";
import { ExportButton } from "../../../components/molecules/ExportButton";

export default function AdminUserManagementPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Current Users</h1>
              <p className="text-gray-600 mt-2">
                View and manage all registered users in your application.
              </p>
            </div>
            <ExportButton
              exportType="users"
              userRole="admin"
              variant="outline"
              size="sm"
            />
          </div>
        </div>
        <CurrentUsersTable />
      </div>
    </AdminLayout>
  );
}
