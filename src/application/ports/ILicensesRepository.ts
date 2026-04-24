import { Observable } from 'rxjs';

export interface ILicensesRepository {
  getLicenses(): Promise<any[]>;
  subscribeLicenses(): Observable<any[]>;
  saveLicense(id: string, data: any): Promise<void>;
  deleteLicense(id: string): Promise<void>;
  updateUserRole(email: string, role: string): Promise<void>;
}
