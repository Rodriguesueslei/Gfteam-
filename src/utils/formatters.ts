import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const getBeltColor = (beltName: string, belts: any[]) => {
  const belt = belts.find(b => b.name.toLowerCase() === beltName.toLowerCase());
  return belt ? belt.color : '#000000';
};

export const getBeltColor2 = (beltName: string, belts: any[]) => {
  const belt = belts.find(b => b.name.toLowerCase() === beltName.toLowerCase());
  return belt ? belt.color2 : null;
};
