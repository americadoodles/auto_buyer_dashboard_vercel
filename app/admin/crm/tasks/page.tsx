'use client';

import React from 'react';
import { TaskManagement } from '../../../../components/organisms/TaskManagement';
import { AdminLayout } from '../../../../components/templates/AdminLayout';

// Mock data for tasks
const mockTasks = [
  {
    id: '1',
    title: 'Follow up with John Smith',
    description: 'Call to discuss Honda Civic pricing',
    priority: {
      id: 1,
      name: 'High',
      color: 'red'
    },
    status: {
      id: 1,
      name: 'Pending',
      color: 'yellow'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    due_date: '2024-01-20',
    completed_at: null,
    related_lead: {
      id: '1',
      first_name: 'John',
      last_name: 'Smith'
    },
    related_contact: null,
    related_deal: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'Send proposal to Sarah Johnson',
    description: 'Email detailed proposal for Toyota Camry',
    priority: {
      id: 2,
      name: 'Medium',
      color: 'yellow'
    },
    status: {
      id: 2,
      name: 'In Progress',
      color: 'blue'
    },
    assigned_to: {
      id: '2',
      username: 'sales_rep_2'
    },
    due_date: '2024-01-18',
    completed_at: null,
    related_lead: null,
    related_contact: {
      id: '2',
      first_name: 'Sarah',
      last_name: 'Johnson'
    },
    related_deal: null,
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    title: 'Schedule test drive',
    description: 'Arrange BMW 3 Series test drive',
    priority: {
      id: 3,
      name: 'Low',
      color: 'green'
    },
    status: {
      id: 3,
      name: 'Completed',
      color: 'green'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    due_date: '2024-01-16',
    completed_at: '2024-01-16T14:30:00Z',
    related_lead: null,
    related_contact: {
      id: '3',
      first_name: 'Mike',
      last_name: 'Davis'
    },
    related_deal: {
      id: '3',
      name: '2023 BMW 3 Series Sale'
    },
    created_at: '2024-01-13T16:45:00Z',
    updated_at: '2024-01-16T14:30:00Z'
  }
];

export default function TasksPage() {
  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
  };

  const handleTaskClick = (taskId: string) => {
    console.log('Task clicked:', taskId);
  };

  const handleCreateTask = () => {
    console.log('Create task clicked');
  };

  const handleExportTasks = () => {
    console.log('Export tasks clicked');
  };

  const handleCompleteTask = (taskId: string) => {
    console.log('Complete task clicked:', taskId);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your sales tasks and activities</p>
        </div>
        <TaskManagement 
          tasks={mockTasks}
          totalTasks={mockTasks.length}
          currentPage={1}
          totalPages={1}
          onPageChange={handlePageChange}
          onTaskClick={handleTaskClick}
          onCreateTask={handleCreateTask}
          onCompleteTask={handleCompleteTask}
          onExportTasks={handleExportTasks}
        />
      </div>
    </AdminLayout>
  );
}
