export interface CheckIn {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  time: any; // Firestore Timestamp
  type: string; // 'manual' | 'qr' | etc.
  tenantId: string;
}

export interface CheckInFilters {
  studentId?: string;
  classId?: string;
}
