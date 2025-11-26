'use client';

import React, { useState } from 'react';
import { TaskManagement } from '../../../../components/organisms/TaskManagement';
import { useTasks, useTaskPriorities, useTaskStatuses } from '../../../../lib/hooks/useTasks';

export default function TasksPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [assignedToFilter, setAssignedToFilter] = useState<string | undefined>(undefined);

  // Fetch all tasks for kanban board (large limit to get all tasks)
  const { tasks, loading, error, refreshTasks } = useTasks({
    skip: 0,
    limit: 1000, // Large limit to fetch all tasks for kanban board
    search: searchTerm || undefined,
    priority_id: priorityFilter,
    status_id: statusFilter,
    assigned_to: assignedToFilter
  });
  const { priorities } = useTaskPriorities();
  const { statuses } = useTaskStatuses();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTaskClick = (taskId: string) => {
    console.log('Task clicked:', taskId);
  };

  const handleCreateTask = async () => {
    try {
      // Here you would call the API to create a new task
      console.log('Create task clicked');
      // Refresh the tasks list
      await refreshTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleExportTasks = () => {
    console.log('Export tasks clicked');
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Here you would call the API to complete the task
      console.log('Complete task clicked:', taskId);
      // Refresh the tasks list
      await refreshTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePriorityFilter = (priorityId: number | undefined) => {
    setPriorityFilter(priorityId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleStatusFilter = (statusId: number | undefined) => {
    setStatusFilter(statusId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleAssignedToFilter = (assignedTo: string | undefined) => {
    setAssignedToFilter(assignedTo);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Transform tasks data to match component expectations
  const transformedTasks = tasks.map(task => {
    const foundPriority = priorities.find(p => p.id === task.priority_id);
    const foundStatus = statuses.find(s => s.id === task.status_id);
    
    return {
      ...task,
      description: task.description || '', // Ensure description is always a string
      priority: foundPriority ? {
        id: foundPriority.id,
        name: foundPriority.name,
        color: foundPriority.color_code
      } : {
        id: task.priority_id ?? 0,
        name: 'Unknown',
        color: 'gray'
      },
      status: foundStatus ? {
        id: foundStatus.id,
        name: foundStatus.name,
        color: foundStatus.color_code
      } : {
        id: task.status_id ?? 0,
        name: 'Unknown',
        color: 'gray'
      },
      assigned_to: task.assigned_to ? {
        id: task.assigned_to,
        username: task.assigned_to_user || task.assigned_to // Use assigned_to_user from API if available
      } : {
        id: '',
        username: 'Unassigned'
      },
      owner: task.owner_user_name ? {
        id: task.owner_user_id || '',
        username: task.owner_user_name
      } : null,
      due_date: task.due_date || new Date().toISOString(), // Ensure due_date is always a string
      completed_at: task.completed_at || null, // Keep as null if not completed
      related_lead: task.related_lead_id ? {
        id: task.related_lead_id,
        first_name: 'Lead', // This would need to be fetched from lead data
        last_name: 'Name'
      } : null,
      related_contact: task.related_contact_id ? {
        id: task.related_contact_id,
        first_name: 'Contact', // This would need to be fetched from contact data
        last_name: 'Name'
      } : null,
      related_deal: task.related_deal_id ? {
        id: task.related_deal_id,
        name: task.related_deal_name || 'Deal Name' // Use related_deal_name from API
      } : null
    };
  });

  // Show loading state
  if (loading && tasks.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading tasks
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshTasks}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="p-6">
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your sales tasks and activities</p>
        </div> */}
        <TaskManagement 
          tasks={transformedTasks}
          totalTasks={tasks.length}
          currentPage={currentPage}
          totalPages={Math.ceil(tasks.length / pageSize)}
          onPageChange={handlePageChange}
          onTaskClick={handleTaskClick}
          onCreateTask={handleCreateTask}
          onCompleteTask={handleCompleteTask}
          onExportTasks={handleExportTasks}
          onSearch={handleSearch}
          onPriorityFilter={handlePriorityFilter}
          onStatusFilter={handleStatusFilter}
          onAssignedToFilter={handleAssignedToFilter}
          priorities={priorities}
          statuses={statuses}
          loading={loading}
          onTasksUpdated={refreshTasks}
        />
      </div>
  );
}
