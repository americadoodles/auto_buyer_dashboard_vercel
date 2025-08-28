# Atomic Design Structure

This project follows the Atomic Design methodology to create a scalable and maintainable component system.

## Structure Overview

```
components/
├── atoms/           # Basic building blocks
├── molecules/       # Simple combinations of atoms
├── organisms/       # Complex UI components
└── templates/       # Page-level layouts
```

## Atoms

Basic, indivisible components that serve as the foundation for all other components.

- **Icon**: Wrapper for Lucide React icons with consistent sizing
- **Button**: Reusable button with variants (primary, secondary, outline) and sizes
- **Badge**: Small display component for scores, status, or labels

## Molecules

Simple combinations of atoms that form functional units.

- **TableHeader**: Table header with sortable columns
- **TableRow**: Individual table row displaying listing data
- **KpiCard**: Card component for displaying key performance indicators

## Organisms

Complex UI components that combine molecules and atoms to form distinct sections.

- **Header**: Page header with title, description, and action buttons
- **ListingsTable**: Complete table component with header and rows
- **KpiGrid**: Grid layout for multiple KPI cards

## Templates

Page-level layouts that define the structure and arrangement of organisms.

- **PageTemplate**: Base page layout with motion animations and responsive container

## Data Layer

The application follows a clean separation of concerns:

- **Types** (`lib/types/`): TypeScript interfaces and type definitions
- **Data** (`lib/data/`): Mock data and static content
- **Services** (`lib/services/`): API communication layer
- **Hooks** (`lib/hooks/`): Custom React hooks for state management
- **Utils** (`lib/utils/`): Utility functions like formatters

## Benefits

1. **Reusability**: Components can be easily reused across different parts of the application
2. **Maintainability**: Clear separation makes it easier to locate and modify specific functionality
3. **Scalability**: New components can be added following the established pattern
4. **Consistency**: Atomic design ensures consistent styling and behavior
5. **Testing**: Smaller, focused components are easier to test in isolation

## Usage Example

```tsx
import { Button, Badge, Header } from '../components';

export const MyPage = () => {
  return (
    <PageTemplate>
      <Header
        onLoadFromBackend={handleLoad}
        onSeedBackend={handleSeed}
        onRescoreVisible={handleRescore}
        loading={loading}
      />
      {/* Other components */}
    </PageTemplate>
  );
};
```

## Backend Integration

The application includes a robust backend integration layer:

- **ApiService**: Centralized API communication
- **useListings**: Custom hook for managing listings state and operations
- **Error Handling**: Comprehensive error handling for all API operations
- **Loading States**: Proper loading state management for better UX

## Data Duplication Fix

The backend data duplication issue has been resolved by:

1. Using `DISTINCT ON` in SQL queries to prevent duplicate records
2. Improving JOIN operations to avoid cartesian products
3. Proper ordering to ensure consistent results
4. Subquery optimization for latest scores
