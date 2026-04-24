export interface IExpense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: any;
  updatedAt?: any;
  createdAt?: any;
}

export interface IExpenseRepository {
  findAll(): Promise<IExpense[]>;
  add(expense: Omit<IExpense, 'id'>): Promise<string>;
  update(id: string, expense: Partial<IExpense>): Promise<void>;
  delete(id: string): Promise<void>;
}
