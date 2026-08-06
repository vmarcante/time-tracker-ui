export interface CreateUserInput {
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  locale?: string;
  age: number;
}

export interface CreateUserOutput {
  id: string;
  username: string;
  name: string;
  email: string;
}
