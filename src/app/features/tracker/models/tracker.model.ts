export interface TagOutput {
  id: string;
  name: string;
  color: string;
}

export interface TimeEntrySessionOutput {
  id: string;
  startTime: string;
  endTime: string | null;
  description: string | null;
  running: boolean;
  durationSeconds: number;
}

export interface TimeEntrySummaryOutput {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string | null;
  projectId: string;
  projectName: string;
  clientName: string | null;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  running: boolean;
  tags: TagOutput[];
}

export interface TimeEntryDetailOutput extends TimeEntrySummaryOutput {
  companyId: string | null;
  sessions: TimeEntrySessionOutput[];
  createdAt: string;
  updatedAt: string;
}

export interface RunningTimerOutput {
  entryId: string;
  entryName: string;
  session: TimeEntrySessionOutput;
}

export interface CreateTimeEntryInput {
  projectId: string;
  name: string;
  description?: string | null;
  tagIds?: string[];
}

export interface UpdateTimeEntryInput {
  name: string;
  description?: string | null;
}

export interface StartTimerInput {
  entryId?: string | null;
  projectId?: string | null;
  name?: string | null;
  description?: string | null;
}

export interface SessionInput {
  startTime: string;
  endTime: string | null;
  description?: string | null;
}

export interface TagInput {
  name: string;
  color: string;
}

/** View-model da timeline: sessão com `end` sempre concreto (running usa `now`). */
export interface SessionView {
  id: string;
  start: string;
  end: string;
  description?: string | null;
  running: boolean;
}

export function toSessionView(session: TimeEntrySessionOutput, now: Date = new Date()): SessionView {
  return {
    id: session.id,
    start: session.startTime,
    end: session.endTime ?? now.toISOString(),
    description: session.description,
    running: session.running,
  };
}
