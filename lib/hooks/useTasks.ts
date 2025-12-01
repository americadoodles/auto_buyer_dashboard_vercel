// Custom hook for Tasks data
import { useState, useEffect } from 'react';
import { tasksApi, Task, TaskPriority, TaskStatus, TaskDashboard } from '../services/tasksApi';

interface UseTasksParams {
  skip?: number;
  limit?: number;
  assigned_to?: string;
  priority_id?: number;
  status_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  related_lead_id?: string;
  related_contact_id?: string;
  related_deal_id?: string;
  search?: string;
}

export const useTasks = (params?: UseTasksParams) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  console.log('param: ', params)
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getTasks(params);
      console.log('data: ', data)
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [params?.skip, params?.limit, params?.assigned_to, params?.priority_id, params?.status_id, params?.due_date_from, params?.due_date_to, params?.related_lead_id, params?.related_contact_id, params?.related_deal_id, params?.search]);

  const refreshTasks = () => {
    fetchTasks();
  };

  return {
    tasks,
    loading,
    error,
    refreshTasks
  };
};

export const useMyTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching my tasks:', err);
      setError('Failed to fetch my tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    refreshMyTasks: fetchMyTasks
  };
};

export const useTaskDashboard = () => {
  const [dashboardTasks, setDashboardTasks] = useState<TaskDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getTaskDashboard();
      setDashboardTasks(data);
    } catch (err) {
      console.error('Error fetching task dashboard:', err);
      setError('Failed to fetch task dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardTasks();
  }, []);

  return {
    dashboardTasks,
    loading,
    error,
    refreshDashboardTasks: fetchDashboardTasks
  };
};

export const useTaskPriorities = () => {
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getTaskPriorities();
      setPriorities(data);
    } catch (err) {
      console.error('Error fetching task priorities:', err);
      setError('Failed to fetch task priorities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, []);

  return {
    priorities,
    loading,
    error,
    refreshPriorities: fetchPriorities
  };
};

export const useTaskStatuses = () => {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getTaskStatuses();
      setStatuses(data);
    } catch (err) {
      console.error('Error fetching task statuses:', err);
      setError('Failed to fetch task statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  return {
    statuses,
    loading,
    error,
    refreshStatuses: fetchStatuses
  };
};
