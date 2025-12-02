'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { KanbanBoard } from './KanbanBoard';
import { useTaskStatuses, useTaskPriorities } from '../../lib/hooks/useTasks';
import { tasksApi } from '../../lib/services/tasksApi';
import { useAuth } from '../../app/auth/useAuth';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: {
    id: number;
    name: string;
    color: string;
  };
  status: {
    id: number;
    name: string;
    color: string;
  };
  assigned_to: {
    id: string;
    username: string;
  };
  owner?: {
    id: string;
    username: string;
  } | null;
  due_date: string;
  completed_at: string | null;
  related_lead: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  related_contact: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  related_deal: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface TaskManagementProps {
  tasks: Task[];
  totalTasks: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTaskClick: (taskId: string) => void;
  onCreateTask: () => void;
  onCompleteTask: (taskId: string) => void;
  onExportTasks: () => void;
  onSearch?: (search: string) => void;
  onPriorityFilter?: (priorityId: number | undefined) => void;
  onStatusFilter?: (statusId: number | undefined) => void;
  onAssignedToFilter?: (assignedTo: string | undefined) => void;
  priorities?: Array<{ id: number; name: string; color_code?: string, sort_order?: number }>;
  statuses?: Array<{ id: number; name: string; color_code?: string, sort_order?: number }>;
  loading?: boolean;
  onTasksUpdated?: () => void;
}

export const TaskManagement: React.FC<TaskManagementProps> = ({
  tasks,
  totalTasks,
  currentPage,
  totalPages,
  onPageChange,
  onTaskClick,
  onCreateTask,
  onCompleteTask,
  onExportTasks,
  onSearch,
  onPriorityFilter,
  onStatusFilter,
  onAssignedToFilter,
  priorities: prioritiesProp,
  statuses: statusesProp,
  loading,
  onTasksUpdated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [showOverdue, setShowOverdue] = useState(false);
  
  // Get current user for role-based filtering
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  
  // Fetch task statuses and priorities from database
  const { statuses: dbStatuses, loading: statusesLoading } = useTaskStatuses();
  const { priorities: dbPriorities, loading: prioritiesLoading } = useTaskPriorities();
  
  // Filter tasks based on user role
  // Admin: show all tasks
  // Buyer: show only tasks where buyer is the owner
  const roleFilteredTasks = useMemo(() => {
    if (isAdmin) {
      return tasks;
    }
    
    // For buyers, filter tasks where they are the owner
    const buyerId = user?.id;
    if (!buyerId) return [];
    
    return tasks.filter(task => task.owner?.id === buyerId);
  }, [tasks, isAdmin, user?.id]);

  // Use database statuses/priorities if available, otherwise fall back to prop
  const statuses = dbStatuses.length > 0 ? dbStatuses : (statusesProp || []);
  const priorities = dbPriorities.length > 0 ? dbPriorities : (prioritiesProp || []);

  // Helper function to convert hex color to Tailwind classes
  const getTailwindColors = (hexColor: string) => {
    // Map common colors to Tailwind classes
    const colorMap: Record<string, { bg: string; border: string }> = {
      '#3B82F6': { bg: 'bg-blue-50', border: 'border-blue-200' },
      '#10B981': { bg: 'bg-green-50', border: 'border-green-200' },
      '#F59E0B': { bg: 'bg-yellow-50', border: 'border-yellow-200' },
      '#8B5CF6': { bg: 'bg-purple-50', border: 'border-purple-200' },
      '#EF4444': { bg: 'bg-red-50', border: 'border-red-200' },
      '#6B7280': { bg: 'bg-gray-50', border: 'border-gray-200' },
      '#059669': { bg: 'bg-emerald-50', border: 'border-emerald-200' },
    };
    
    return colorMap[hexColor] || { bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value);
    if (onPriorityFilter) {
      const priorityId = value === 'all' ? undefined : parseInt(value, 10);
      onPriorityFilter(priorityId);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    if (onStatusFilter) {
      const statusId = value === 'all' ? undefined : parseInt(value, 10);
      onStatusFilter(statusId);
    }
  };

  const handleAssignedToFilterChange = (value: string) => {
    setAssignedFilter(value);
    if (onAssignedToFilter) {
      const assignedTo = value === 'all' ? undefined : value;
      onAssignedToFilter(assignedTo);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'green';
      case 'in progress': return 'blue';
      case 'not started': return 'gray';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    const date = new Date(dueDate);
    const now = new Date();
    return date < now;
  };

  const overdueTasks = roleFilteredTasks.filter(task => isOverdue(task.due_date));
  const dueTodayTasks = roleFilteredTasks.filter(task => {
    if (!task.due_date) return false;
    const date = new Date(task.due_date);
    const today = new Date();
    return date.toDateString() === today.toDateString() && !task.completed_at;
  });

  // Define the Kanban stages from database
  const kanbanStages = useMemo(() => {
    // Use database statuses from useTaskStatuses hook
    return dbStatuses
      .filter(status => status.is_active !== false) // Only include active statuses
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) // Sort by sort_order
      .map(status => {
        const color = status.color_code || '#6B7280'; // Default gray if no color
        const tailwindColors = getTailwindColors(color);
        return {
          id: status.id,
          name: status.name,
          color: color,
          bgColor: tailwindColors.bg,
          borderColor: tailwindColors.border
        };
      });
  }, [dbStatuses]);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    let filtered = roleFilteredTasks;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.assigned_to?.username.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const statusId = parseInt(statusFilter, 10);
      filtered = filtered.filter(task => task.status.id === statusId);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      const priorityId = parseInt(priorityFilter, 10);
      filtered = filtered.filter(task => task.priority.id === priorityId);
    }

    // Assigned filter
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'me') {
        // You might want to check against current user
        // For now, just pass through
      } else {
        filtered = filtered.filter(task =>
          task.assigned_to?.username.toLowerCase() === assignedFilter.toLowerCase()
        );
      }
    }

    // Overdue filter
    if (showOverdue) {
      filtered = filtered.filter(task => isOverdue(task.due_date));
    }

    return filtered;
  }, [roleFilteredTasks, searchTerm, statusFilter, priorityFilter, assignedFilter, showOverdue]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    kanbanStages.forEach(stage => {
      grouped[stage.name] = [];
    });

    filteredTasks.forEach(task => {
      const statusName = task.status?.name || '';
      const matchedStage = kanbanStages.find(s => 
        s.name.toLowerCase() === statusName.toLowerCase()
      );
      if (matchedStage) {
        grouped[matchedStage.name].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, kanbanStages]);

  // Calculate status totals
  const getStatusStats = (statusName: string) => {
    const statusTasks = tasksByStatus[statusName] || [];
    return { count: statusTasks.length };
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onExportTasks}>
            <Icon name="download" className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={onCreateTask}>
            <Icon name="plus" className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2 flex-shrink-0">
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="check-circle" className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Total Tasks</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{roleFilteredTasks.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Icon name="alert-circle" className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Overdue</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{overdueTasks.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Icon name="clock" className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Due Today</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{dueTodayTasks.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon name="check" className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Completed</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {roleFilteredTasks.filter(task => task.status.name.toLowerCase() === 'completed').length}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters and Kanban Layout */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Filters - Left Side */}
        <Card className="p-4 lg:w-72 flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || statusesLoading}
              >
                <option value="all">All Status</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id.toString()}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => handlePriorityFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || prioritiesLoading}
              >
                <option value="all">All Priorities</option>
                {[...priorities]
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((priority) => (
                    <option key={priority.id} value={priority.id.toString()}>
                      {priority.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={assignedFilter}
                onChange={(e) => handleAssignedToFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="all">All Users</option>
                <option value="me">Me</option>
                <option value="john">John Doe</option>
                <option value="jane">Jane Smith</option>
              </select>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOverdue}
                  onChange={(e) => setShowOverdue(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Show Overdue Only</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Kanban Board - Right Side */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <KanbanBoard
            items={filteredTasks}
            stages={kanbanStages}
            itemsByStage={tasksByStatus}
            getStageStats={getStatusStats}
            formatDate={formatDate}
            getStageColor={(statusName) => {
              const status = statuses.find(s => s.name.toLowerCase() === statusName.toLowerCase());
              return getStatusColor(status?.name || statusName);
            }}
            onItemClick={onTaskClick}
            onItemUpdated={onTasksUpdated}
            onItemMove={async (taskId, newStatusId, newStatusName) => {
              await tasksApi.updateTask(taskId, {
                status_id: typeof newStatusId === 'number' ? newStatusId : parseInt(newStatusId.toString(), 10)
              });
            }}
            stagesFromDb={statuses}
            itemType="task"
            onCreateItem={(stageName, stageId) => {
              // Handled by KanbanBoard's create button
            }}
            renderCard={(task, stage, onItemClick) => (
          <>
            {/* Task Header */}
            <div className="mb-1">
              <h4 
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(task);
                }}
                className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
              >
                {task.title}
              </h4>
            </div>

            {/* Priority */}
            <div className="mb-1">
              <Badge color={getPriorityColor(task.priority.name)}>
                {task.priority.name}
              </Badge>
            </div>

            {/* Due Date */}
            <div className="mb-1">
              <div className={`flex items-center space-x-1 text-xs ${isOverdue(task.due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                <Icon name="calendar" className="w-3 h-3" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            </div>

            {/* Owner and Assigned To */}
            {(task.owner || (task.assigned_to && task.assigned_to.username !== 'Unassigned')) && (
              <div className="mb-1 flex gap-2">
                {task.owner && (
                  <div className="flex-1 flex items-center space-x-1 text-xs text-gray-700 bg-blue-100 rounded-lg px-2 py-1">
                    <Icon name="user" className="w-3 h-3" />
                    <span className="truncate">Owner: {task.owner.username}</span>
                  </div>
                )}
                {/* {task.assigned_to && task.assigned_to.username !== 'Unassigned' && (
                  <div className="flex-1 flex items-center space-x-1 text-xs text-gray-700 bg-yellow-200 rounded-lg px-2 py-1">
                    <Icon name="user" className="w-3 h-3" />
                    <span className="truncate">Assigned: {task.assigned_to.username}</span>
                  </div>
                )} */}
              </div>
            )}

            {/* Related To */}
            {(task.related_lead || task.related_contact || task.related_deal) && (
              <div className="mb-1">
                <div className="text-xs text-gray-500 space-y-1">
                  {task.related_lead && (
                    <div>Lead: {task.related_lead.first_name} {task.related_lead.last_name}</div>
                  )}
                  {task.related_contact && (
                    <div>Contact: {task.related_contact.first_name} {task.related_contact.last_name}</div>
                  )}
                  {task.related_deal && (
                    <div>Deal: {task.related_deal.name}</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
            emptyStateText="No tasks in this status"
          />
          </div>
        </div>
      </div>
    </div>
  );
};
