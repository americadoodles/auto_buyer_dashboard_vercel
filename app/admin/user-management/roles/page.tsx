import RoleManagementTable from "components/organisms/RoleManagementTable";
import { AdminLayout } from "../../../../components/templates/AdminLayout";

export default function RolesPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-2">
            Configure user roles and permissions for your application.
          </p>
        </div>
        <RoleManagementTable />
      </div>
    </AdminLayout>
  );
}
