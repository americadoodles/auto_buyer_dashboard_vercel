'use client';

import React, { useState } from 'react';
import { Card } from '../molecules/Card';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Pagination } from '../molecules/Pagination';

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
  onExportTasks
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [showOverdue, setShowOverdue] = useState(false);

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
    const date = new Date(dueDate);
    const now = new Date();
    return date < now && !tasks.find(task => task.due_date === dueDate)?.completed_at;
  };

  const overdueTasks = tasks.filter(task => isOverdue(task.due_date));
  const dueTodayTasks = tasks.filter(task => {
    const date = new Date(task.due_date);
    const today = new Date();
    return date.toDateString() === today.toDateString() && !task.completed_at;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your tasks and activities ({totalTasks} total)
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="check-circle" className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{totalTasks}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Icon name="alert-circle" className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{overdueTasks.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Icon name="clock" className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Due Today</p>
              <p className="text-2xl font-semibold text-gray-900">{dueTodayTasks.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Icon name="check" className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {tasks.filter(task => task.status.name === 'Completed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="me">Me</option>
              <option value="john">John Doe</option>
              <option value="jane">Jane Smith</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOverdue}
                onChange={(e) => setShowOverdue(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show Overdue Only</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Task List */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <TableHeader
              columns={[
                { key: 'title', label: 'Task', sortable: true },
                { key: 'priority', label: 'Priority', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
                { key: 'assigned', label: 'Assigned To', sortable: true },
                { key: 'due_date', label: 'Due Date', sortable: true },
                { key: 'related', label: 'Related To', sortable: false },
                { key: 'actions', label: 'Actions', sortable: false }
              ]}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <TableRow key={task.id} onClick={() => onTaskClick(task.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={getPriorityColor(task.priority.name)}>
                      {task.priority.name}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={getStatusColor(task.status.name)}>
                      {task.status.name}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.assigned_to.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${isOverdue(task.due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatDate(task.due_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.related_lead && (
                      <div>Lead: {task.related_lead.first_name} {task.related_lead.last_name}</div>
                    )}
                    {task.related_contact && (
                      <div>Contact: {task.related_contact.first_name} {task.related_contact.last_name}</div>
                    )}
                    {task.related_deal && (
                      <div>Deal: {task.related_deal.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {task.status.name !== 'Completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteTask(task.id);
                          }}
                        >
                          <Icon name="check" className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Icon name="eye" className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Icon name="edit" className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </TableRow>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </Card>
    </div>
  );
};
