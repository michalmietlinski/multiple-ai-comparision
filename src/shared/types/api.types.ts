/**
 * api.types.ts - Shared type definitions for API, provider, and model-related types
 * 
 * This file contains shared type definitions used across both client and server code
 * for API, provider, and model-related functionality.
 */

/**
 * Supported AI provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'deepseek' | 'gemini' | 'custom';

/**
 * API model information
 * 
 * Represents a model available through an API provider.
 */
export interface ApiModel {
  /** Unique identifier for the model */
  id: string;
  
  /** Display name of the model */
  name: string;
  
  /** Provider that offers this model */
  provider: string;
  
  /** Whether the model is currently active */
  active: boolean;
}

/**
 * Provider configuration
 * 
 * Basic information about an AI provider.
 */
export interface Provider {
  /** Unique identifier for the provider */
  id: string;
  
  /** Display name of the provider */
  name: string;
  
  /** Type of the provider */
  type: ProviderType;
}

/**
 * API provider with authentication details
 * 
 * Represents a configured API provider with authentication details.
 */
export interface ApiProvider {
  /** Unique identifier for the provider */
  id: string;
  
  /** Display name of the provider */
  name: string;
  
  /** Provider type identifier */
  provider: string;
  
  /** API key for authentication */
  key: string;
  
  /** Optional custom URL for the API */
  url?: string;
  
  /** Whether the provider is currently active */
  active: boolean;
  
  /** Optional list of model identifiers available through this provider */
  models?: string[];
}

/**
 * Model configuration
 * 
 * Detailed configuration for a model, including parameters.
 */
export interface Model {
  /** Unique identifier for the model */
  id: string;
  
  /** Display name of the model */
  name: string;
  
  /** Provider that offers this model */
  provider: string;
  
  /** Optional maximum number of tokens the model can process */
  maxTokens?: number;
  
  /** Optional temperature parameter for controlling randomness */
  temperature?: number;
}

/**
 * API configuration
 * 
 * Configuration for connecting to an API provider.
 */
export interface ApiConfig {
  /** Type of the provider */
  provider: ProviderType;
  
  /** API key for authentication */
  apiKey: string;
  
  /** Optional custom URL for the API */
  baseUrl?: string;
  
  /** Optional list of model identifiers available through this provider */
  models?: string[];
}

/**
 * Provider configuration
 * 
 * Configuration for a provider, including available models.
 */
export interface ProviderConfig {
  /** Display name of the provider */
  name: string;
  
  /** List of models available through this provider */
  models: Model[];
}

/**
 * Standard success response
 */
export interface SuccessResponse {
  /** Success message */
  message: string;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
} 
