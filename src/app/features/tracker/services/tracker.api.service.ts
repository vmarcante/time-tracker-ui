import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../shared/services/api/http.service';
import { ApiResponse, PageWrapper } from '../../../shared/types';
import {
  CreateProjectInput,
  CreateProjectOutput,
  ProjectSummaryOutput,
} from '../../main/models/company-management.model';
import {
  CreateTimeEntryInput,
  RunningTimerOutput,
  SessionInput,
  StartTimerInput,
  TagInput,
  TagOutput,
  TimeEntryDetailOutput,
  TimeEntrySummaryOutput,
  UpdateTimeEntryInput,
} from '../models/tracker.model';

@Injectable({
  providedIn: 'root',
})
export class TrackerApiService {
  private httpService = inject(HttpService);

  listMyEntries(
    filters: { projectId?: string; from?: string; to?: string } = {},
    page = 1,
    size = 20,
  ): ApiResponse<PageWrapper<TimeEntrySummaryOutput>> {
    const params: Record<string, string | number> = { page, size };
    if (filters.projectId) params['projectId'] = filters.projectId;
    if (filters.from) params['from'] = this.toApiDateTime(filters.from);
    if (filters.to) params['to'] = this.toApiDateTime(filters.to);
    return this.httpService.get('/time-entries', { params });
  }

  findEntry(entryId: string): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.get(`/time-entries/${entryId}`);
  }

  createEntry(input: CreateTimeEntryInput): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.post('/time-entries', input);
  }

  updateEntry(entryId: string, input: UpdateTimeEntryInput): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.put(`/time-entries/${entryId}`, input);
  }

  deactivateEntry(entryId: string): ApiResponse<void> {
    return this.httpService.delete(`/time-entries/${entryId}`);
  }

  setEntryTags(entryId: string, tagIds: string[]): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.put(`/time-entries/${entryId}/tags`, { tagIds });
  }

  createSession(entryId: string, input: SessionInput): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.post(`/time-entries/${entryId}/sessions`, this.normalizeSession(input));
  }

  updateSession(
    entryId: string,
    sessionId: string,
    input: SessionInput,
  ): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.put(
      `/time-entries/${entryId}/sessions/${sessionId}`,
      this.normalizeSession(input),
    );
  }

  deleteSession(entryId: string, sessionId: string): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.delete(`/time-entries/${entryId}/sessions/${sessionId}`);
  }

  startTimer(input: StartTimerInput): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.post('/timer/start', input);
  }

  stopTimer(): ApiResponse<TimeEntryDetailOutput> {
    return this.httpService.post('/timer/stop', {});
  }

  currentTimer(): ApiResponse<RunningTimerOutput | null> {
    return this.httpService.get('/timer/current');
  }

  listPersonalProjects(page = 1, size = 50): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get('/projects', { params: { page, size } });
  }

  createPersonalProject(input: CreateProjectInput): ApiResponse<CreateProjectOutput> {
    return this.httpService.post('/projects', input);
  }

  listTags(): ApiResponse<TagOutput[]> {
    return this.httpService.get('/tags');
  }

  createTag(input: TagInput): ApiResponse<TagOutput> {
    return this.httpService.post('/tags', input);
  }

  updateTag(tagId: string, input: TagInput): ApiResponse<TagOutput> {
    return this.httpService.put(`/tags/${tagId}`, input);
  }

  deleteTag(tagId: string): ApiResponse<void> {
    return this.httpService.delete(`/tags/${tagId}`);
  }

  /**
   * O backend desserializa `LocalDateTime` (sem timezone). Converte ISO/UTC para
   * `yyyy-MM-dd'T'HH:mm:ss` no horário local.
   */
  private normalizeSession(input: SessionInput): SessionInput {
    return {
      ...input,
      startTime: this.toApiDateTime(input.startTime),
      endTime: input.endTime ? this.toApiDateTime(input.endTime) : null,
    };
  }

  private toApiDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }
}
