/**
 * common.types.ts - Shared utility type definitions
 * 
 * This file contains shared utility type definitions used across both client and server code.
 */

/**
 * Pagination parameters
 * 
 * Used for paginated API requests.
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  
  /** Number of items per page */
  limit: number;
}

/**
 * Sort parameters
 * 
 * Used for sorted API requests.
 */
export interface SortParams {
  /** Field to sort by */
  field: string;
  
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * ID parameter
 * 
 * Used for API requests that require an ID.
 */
export interface IdParam {
  /** Unique identifier */
  id: string;
}

/**
 * Date range
 * 
 * Used for filtering by date range.
 */
export interface DateRange {
  /** Start date (ISO string) */
  startDate: string;
  
  /** End date (ISO string) */
  endDate: string;
}

/**
 * Generic type for API responses with pagination
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  
  /** Total number of items */
  total: number;
  
  /** Current page number */
  page: number;
  
  /** Number of items per page */
  limit: number;
  
  /** Total number of pages */
  pages: number;
}

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
} 
