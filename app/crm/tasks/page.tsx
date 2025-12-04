'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TaskManagement } from '../../../components/organisms/TaskManagement';
import { useTasks, useTaskPriorities, useTaskStatuses } from '../../../lib/hooks/useTasks';
import { useAuth } from '../../auth/useAuth';

export default function TasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [assignedToFilter, setAssignedToFilter] = useState<string | undefined>(undefined);
  
  // Determine if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  
  // For admins: get all tasks (no owner/assigned_to filter)
  // For buyers: backend will filter by owner, but we'll also filter on frontend for assigned_to
  const { tasks: allTasks, loading, error, refreshTasks } = useTasks({
    skip: 0,
    limit: 1000, // Large limit to fetch all tasks for kanban board
    search: searchTerm || undefined,
    priority_id: priorityFilter,
    status_id: statusFilter,
    // Only apply assigned_to filter for admins (buyers are already filtered by backend by owner)
    assigned_to: isAdmin ? assignedToFilter : undefined
  });
  
  // Filter tasks for buyers: show tasks where owner_id OR assigned_to matches buyer's ID
  const tasks = useMemo(() => {
    if (isAdmin) {
      return allTasks;
    }
    // For buyers, filter tasks where owner_id OR assigned_to matches their ID
    const buyerId = user?.id;
    if (!buyerId) return [];
    
    return allTasks.filter(task => 
      task.owner_user_id === buyerId || 
      task.assigned_to === buyerId
    );
  }, [allTasks, isAdmin, user?.id]);
  const { priorities } = useTaskPriorities();
  const { statuses } = useTaskStatuses();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTaskClick = (taskId: string) => {
    router.push(`/crm/tasks/${taskId}`);
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
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 h-full bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error loading tasks
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshTasks}
                  className="bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
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
      <div className="p-6 h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
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
