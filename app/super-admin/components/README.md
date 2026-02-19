# Super Admin Dashboard Components

## ProjectListSection

A component that displays projects in a table format with real-time filtering capabilities.

### Features

- Displays project ID, name, enabled status, creation date, and member count
- Real-time client-side filtering by project name or ID (case-insensitive)
- "Access" button for each project to initiate access simulation
- Optional row click handler for project selection
- Responsive table layout with dark mode support

### Usage Example

```tsx
import ProjectListSection from './components/ProjectListSection';

function SuperAdminDashboard() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Fetch projects from API
    fetch('/api/super-admin/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  }, []);

  const handleAccessProject = async (projectId: string) => {
    // Call access simulation API
    const response = await fetch('/api/super-admin/access-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    
    if (response.ok) {
      const { redirectUrl } = await response.json();
      window.location.href = redirectUrl;
    }
  };

  const handleProjectSelect = (projectId: string) => {
    // Optional: Handle project selection (e.g., show event usage chart)
    console.log('Selected project:', projectId);
  };

  return (
    <ProjectListSection
      projects={projects}
      onAccessProject={handleAccessProject}
      onProjectSelect={handleProjectSelect}
    />
  );
}
```

### Props

- `projects`: Array of ProjectWithStats objects
- `onAccessProject`: Callback function when "Access" button is clicked (required)
- `onProjectSelect`: Optional callback function when a project row is clicked

### Data Structure

```typescript
interface ProjectWithStats {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: Date | string;
  memberCount: number;
}
```

### Testing

The component's filtering logic is thoroughly tested with:

- **Property-based tests** (`__tests__/super-admin/project-filtering.property.test.ts`): 
  - Validates filtering correctness across 100+ random inputs
  - Ensures case-insensitive matching
  - Verifies ID or name matching logic

- **Unit tests** (`__tests__/super-admin/project-filtering.test.ts`):
  - Tests edge cases (empty filter, no matches, special characters, unicode)
  - Validates real-time filtering behavior
  - Tests whitespace handling

All tests pass successfully, ensuring robust filtering functionality.
