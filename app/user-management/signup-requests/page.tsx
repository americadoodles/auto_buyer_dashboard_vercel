import { AdminUserManagement } from "components/organisms/AdminUserManagement";

export default function SignupRequestsPage() {
  return (
    <div className="p-6 bg-claude-cream dark:bg-coal-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-claude-ink dark:text-coal-100">Signup Requests</h1>
        <p className="text-claude-muted dark:text-coal-300 mt-2">
          Review and approve new user registration requests from buyers.
        </p>
      </div>
      <AdminUserManagement />
    </div>
  );
}
