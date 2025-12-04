import RoleManagementTable from "components/organisms/RoleManagementTable";

export default function RolesPage() {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h1>
        <p className="text-gray-600 dark:text-gray-200 mt-2">
          Configure user roles and permissions for your application.
        </p>
      </div>
      <RoleManagementTable />
    </div>
  );
}
