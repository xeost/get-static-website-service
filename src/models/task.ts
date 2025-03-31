export interface Task {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    url: string;
    callbackUrl: string;
    createdAt: Date;
    updatedAt: Date;
    result?: string;
    error?: string;
  }