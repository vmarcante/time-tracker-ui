import { Project } from './project.type';
import { Tag } from './tag.type';

export interface TimeEntrySession {
  id: string;
  start: string;
  end: string;
  description?: string;
}

export interface TimeEntry {
  id: string;
  name: string;
  description?: string;
  project: Project;
  start: string;
  end: string;
  tags?: Tag[];
  sessions?: TimeEntrySession[];
}
