export interface InviteInfoOutput {
  name: string;
  email: string;
  phone: string | null;
  age: number | null;
  companyName: string;
}
export interface EmailAvailabilityOutput {
  available: boolean;
  preRegistered: boolean;
}
