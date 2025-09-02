import { AdminUserManagement } from "components/organisms/AdminUserManagement";
import { AdminLayout } from "../../../../components/templates/AdminLayout";

export default function SignupRequestsPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Signup Requests</h1>
          <p className="text-gray-600 mt-2">
            Review and approve new user registration requests from buyers.
          </p>
        </div>
        <AdminUserManagement />
      </div>
    </AdminLayout>
  );
}
