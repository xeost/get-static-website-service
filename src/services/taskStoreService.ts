import type { Task } from 'models/task.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory task store service
 * This can be replaced with a Redis-based implementation in the future
 */
export class TaskStoreService {
  private tasks: Map<string, Task> = new Map();

  /**
   * Create a new task
   */
  createTask(url: string, callbackUrl: string): Task {
    const id = uuidv4();
    const task: Task = {
      id,
      status: 'pending',
      url,
      callbackUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Update a task
   */
  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }
} 