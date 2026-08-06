export interface ApiResponse<T> {
  success: boolean;
  status: number;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  status: number;
  data: {
    message?: string;
    errors?: string[];
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
