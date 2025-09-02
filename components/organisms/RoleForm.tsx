import React, { useState } from "react";
import { Role, RoleCreate, RoleEdit } from "../../lib/types/role";

interface RoleFormProps {
  onSubmit: (role: RoleCreate | RoleEdit) => void | Promise<void>;
  initial?: Role;
  loading?: boolean;
  submitLabel?: string;
}

const RoleForm: React.FC<RoleFormProps> = ({ onSubmit, initial, loading, submitLabel }) => {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initial) {
      onSubmit({ id: initial.id, name, description });
    } else {
      onSubmit({ name, description });
    }
  };

  return (
    <form className="mb-4" onSubmit={handleSubmit}>
      <div className="mb-2">
        <label className="block text-sm font-medium">Role Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          required
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
        {submitLabel || (initial ? "Update Role" : "Create Role")}
      </button>
    </form>
  );
};

export default RoleForm;
