// UI Component Types

import { Repository, RepositoryWithSelection } from './github.types'
import { UserRepository } from './database.types'

// Loading States
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface AsyncState<T> extends LoadingState {
  data: T | null
}

// Component Props Types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Repository UI Types
export interface RepositoryCardProps {
  repository: RepositoryWithSelection
  onSelect: (repository: RepositoryWithSelection) => void
  isSelected?: boolean
  className?: string
}

export interface RepositoryListProps {
  repositories: RepositoryWithSelection[]
  selectedId?: string
  onSelect: (repository: RepositoryWithSelection) => void
  isLoading?: boolean
  error?: string | null
}

export interface RepositorySelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (repository: RepositoryWithSelection) => void
  currentRepository?: UserRepository | null
}

// File Explorer Types
export interface FileExplorerProps {
  repository: Repository
  currentPath?: string
  onPathChange: (path: string) => void
  onFileSelect: (path: string) => void
}

export interface FileItemProps {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  onClick: () => void
  isSelected?: boolean
  className?: string
}

export interface DirectoryBreadcrumbProps {
  path: string
  onNavigate: (path: string) => void
  repository: Repository
}

// Modal Types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

// Form Types
export interface SearchFormData {
  query: string
}

export interface RepositorySelectFormData {
  repositoryId: string
}

// Navigation Types
export interface NavigationItem {
  label: string
  path: string
  icon?: React.ComponentType
  isActive?: boolean
}

export interface BreadcrumbItem {
  label: string
  path?: string
  isActive?: boolean
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

// Error Boundary Types
export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export interface ErrorDisplayProps {
  error: Error | string
  onRetry?: () => void
  className?: string
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

// Layout Types
export interface LayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  className?: string
}

export interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
  children: React.ReactNode
}

// Table Types
export interface TableColumn<T> {
  key: keyof T | string
  label: string
  render?: (value: unknown, item: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  className?: string
}

// Pagination Types
export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  maxVisiblePages?: number
  className?: string
}

// Search Types
export interface SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: (value: string) => void
  isLoading?: boolean
  className?: string
}

// Filter Types
export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface FilterProps {
  options: FilterOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  title?: string
  multiple?: boolean
  className?: string
}