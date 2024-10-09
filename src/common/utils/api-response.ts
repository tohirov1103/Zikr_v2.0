export interface ApiResponse<T> {
    status: boolean;
    message: string;
    data?: T;
  }
  
  export function successResponse<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      status: true,
      message,
      data,
    };
  }
  
  export function errorResponse(message: string): ApiResponse<null> {
    return {
      status: false,
      message,
    };
  }
  