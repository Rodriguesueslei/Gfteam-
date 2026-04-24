export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserFilters {
  role?: string;
  approved?: boolean;
}
