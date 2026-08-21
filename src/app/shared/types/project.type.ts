import { Client } from './client.type';

export interface Project {
  id: string;
  name: string;
  client?: Client;
}
