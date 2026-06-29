import RoleManagementTable from "components/organisms/RoleManagementTable";

export default function RolesPage() {
  return (
    <div className="p-6 bg-claude-cream dark:bg-coal-900">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-claude-ink dark:text-coal-100">Role Management</h1>
        <p className="text-claude-muted dark:text-coal-200 mt-2">
          Configure user roles and permissions for your application.
        </p>
      </div>
      <RoleManagementTable />
    </div>
  );
}
