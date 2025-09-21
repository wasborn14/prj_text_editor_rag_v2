export const API_ENDPOINTS = {
  HEALTH: '/health',
  ROOT: '/',
  SEARCH: '/api/search',
  SEARCH_DIRECTORY: '/api/search/directory',
  SYNC: '/api/sync',
  REPOSITORY_STRUCTURE: '/api/repository/structure',
  CHAT: '/api/chat'
} as const;

export const DEFAULT_CONFIG = {
  CHUNK_SIZE: 500,
  SEARCH_LIMIT: 5,
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const REPOSITORY_CONFIG = {
  DEFAULT_REPOSITORY: 'wasborn14/test-editor',
  MAX_FILES: 1000,
  MAX_DEPTH: 5
} as const;