# Components Directory Structure

This directory contains all React components organized by their purpose and scope.

## Directory Organization

### `/features`
Feature-specific components that implement complete user-facing functionality.

**Purpose**: Contains components that are tightly coupled to specific features of the application.

**Examples**:
- `auth/` - Authentication-related components (LoginForm, SignUpForm, etc.)
- `editor/` - Markdown editor components
- `sidebar/` - Sidebar navigation components
- `rag/` - RAG search and chat components

**Characteristics**:
- Business logic heavy
- May use hooks and state management
- Composed of UI and layout components
- Feature-specific, less reusable across features

### `/layout`
Layout components that define the structure and arrangement of pages.

**Purpose**: Provides consistent page layouts and structural components.

**Examples**:
- `Header/` - Application header with navigation
- `Footer/` - Application footer
- `Sidebar/` - Main sidebar layout
- `Container/` - Content container wrapper
- `Grid/` - Grid layout system

**Characteristics**:
- Defines page structure
- Reusable across different pages
- Minimal business logic
- Focuses on positioning and arrangement

### `/ui`
Reusable UI components (Design System / Atomic components).

**Purpose**: Provides a consistent, reusable set of UI primitives.

**Examples**:
- `Button/` - Button variants (primary, secondary, ghost, etc.)
- `Input/` - Form input components
- `Modal/` - Dialog and modal components
- `Card/` - Card container
- `Badge/` - Badge component
- `Dropdown/` - Dropdown menu

**Characteristics**:
- Highly reusable
- No business logic
- Styled primitives
- Can be used anywhere in the app
- Often based on design tokens

## Component Structure

Each component should follow this structure:

```
ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.test.tsx  # Unit tests (optional)
├── ComponentName.stories.tsx # Storybook stories (optional)
├── index.ts               # Export barrel
└── types.ts               # Component-specific types (optional)
```

## Import Examples

```typescript
// Import from features
import { LoginForm } from '@/components/features/auth/LoginForm'

// Import from layout
import { Header } from '@/components/layout/Header'

// Import from ui
import { Button } from '@/components/ui/Button'
```

## Guidelines

1. **Keep components focused**: Each component should have a single responsibility
2. **Use TypeScript**: All components should be properly typed
3. **Export through index**: Use barrel exports for cleaner imports
4. **Document complex logic**: Add JSDoc comments for complex components
5. **Follow naming conventions**: Use PascalCase for component names
