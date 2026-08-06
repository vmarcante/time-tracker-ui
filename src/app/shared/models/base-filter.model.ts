export interface BaseFilter {
  page?: number;
  size?: number;
  sort?: string[];
}

export interface DateRangeFilter extends BaseFilter {
  startDate?: string;
  endDate?: string;
}

export interface SearchFilter extends BaseFilter {
  search?: string;
}
