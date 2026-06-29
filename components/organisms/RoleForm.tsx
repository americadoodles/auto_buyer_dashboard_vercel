import React, { useState } from "react";
import { Role, RoleCreate, RoleEdit } from "../../lib/types/role";
import { Plus, Save } from "lucide-react";

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

  const handleCancel = () => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description || "");
    } else {
      setName("");
      setDescription("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-claude-text dark:text-coal-200 mb-2">
            Role Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md shadow-sm bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
            placeholder="Enter role name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-claude-text dark:text-coal-200 mb-2">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md shadow-sm bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
            placeholder="Enter role description"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-3 pt-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-coal-100 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : initial ? (
            <Save className="w-4 h-4 mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {submitLabel || (initial ? "Update Role" : "Create Role")}
        </button>
        
        {initial && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-claude-divider dark:border-coal-600 text-sm font-medium rounded-md text-claude-text dark:text-coal-200 bg-claude-surface dark:bg-coal-700 hover:bg-claude-cream dark:hover:bg-coal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default RoleForm;
