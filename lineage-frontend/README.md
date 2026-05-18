# Data Lineage Platform - Frontend

A modern, responsive React + TypeScript frontend for the Data Lineage Platform. Built with Vite, React Query, React Router, and Tailwind CSS.

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Running backend API (localhost:8000)

### Setup

1. **Install Dependencies**

```bash
npm install
```

2. **Configure Environment**

```bash
cp .env.example .env.local

# Edit .env.local with your settings
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_ENV=development
```

3. **Start Development Server**

```bash
npm run dev
```

Access the application at `http://localhost:5173`

## Available Scripts

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code with Prettier
npm run format

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Watch tests during development
npm run test:watch
```

## Project Structure

```
lineage-frontend/
├── src/
│   ├── components/                # Reusable components
│   │   ├── common/               # Common components used across app
│   │   │   ├── ErrorState.tsx    # Error display component
│   │   │   ├── EmptyState.tsx    # Empty state display
│   │   │   ├── LoadingSpinner.tsx # Loading indicator
│   │   │   └── AccessDeniedState.tsx # Access denied display
│   │   ├── filters/              # Filter components
│   │   ├── grid/                 # Grid/table components
│   │   ├── layout/               # Layout components
│   │   └── modals/               # Modal components
│   ├── features/                  # Feature modules
│   │   ├── fields/               # Field feature
│   │   │   ├── FieldListPage.tsx
│   │   │   ├── Field360Page.tsx
│   │   │   ├── fieldApi.ts
│   │   │   └── [components]
│   │   ├── comparison/           # Comparison feature
│   │   │   └── FieldComparisonPage.tsx
│   │   ├── impact/               # Impact analysis feature
│   │   │   └── ImpactAnalysisPage.tsx
│   │   ├── graphExplorer/        # Graph explorer feature
│   │   │   └── GraphExplorerPage.tsx
│   │   ├── search/               # Global search feature
│   │   │   └── GlobalSearchPage.tsx
│   │   └── dashboard/            # Dashboard feature
│   │       └── DashboardPage.tsx
│   ├── hooks/                     # Custom React hooks
│   │   └── useDebounce.ts
│   ├── __tests__/                # Test files
│   │   ├── Field360Page.test.tsx
│   │   └── [other tests]
│   ├── app/                      # App configuration
│   │   └── queryClient.ts        # React Query configuration
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── public/                       # Static assets
│   └── favicon.svg
├── tests/                        # Test configuration
│   └── setup.ts
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── package.json
├── .env.example                 # Environment variables template
├── vitest.config.ts             # Vitest configuration
└── README.md                    # This file
```

## Configuration

### Environment Variables

Create `.env.local` with the following:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Application
VITE_APP_ENV=development
VITE_APP_NAME=Data Lineage Platform
```

## Dependencies

### Core
- **react** (18.0+): UI library
- **react-router-dom**: Client-side routing
- **react-query**: Server state management and caching

### Styling
- **tailwind-css**: Utility-first CSS framework
- **postcss**: CSS processing

### Development
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **vitest**: Testing framework
- **@testing-library/react**: Component testing utilities

## Features

### Pages

#### Dashboard
- Real-time key metrics: Total Fields, Jurisdictions, Lineage Coverage, High Risk Fields
- Visual stat cards with icons and color-coded backgrounds
- Activity feed and risk indicators
- Professional data visualization

#### Field Search & Discovery
- Advanced search with debouncing (400ms)
- Filtering by jurisdiction, criticality, and status
- Professional data tables with badges
- Pagination support
- Loading and error states

#### Field 360 View
- Comprehensive field details
- React Flow-based data lineage graph visualization
- Multiple tabs: Overview, Business, Technical, XSLT, Java, Downstream
- Color-coded transformation nodes (Field, XSLT, XPath, Java)
- Error handling and access control
- Back navigation with history support

#### Field Comparison
- Compare fields across jurisdictions
- Attribute-level comparison table
- Multi-jurisdiction support
- Input validation and error states

#### Impact Analysis
- Analyze impact of changes on downstream components
- Support for multiple source types: Field, XSLT Variable, Java Method, XPath
- Severity indicators with color badges (HIGH/MEDIUM/LOW)
- Real-time analysis with Enter key support

#### Graph Explorer
- Interactive React Flow canvas for graph visualization
- Node search with type filtering
- Dynamic node positioning and layout
- Node details panel with inspection tools
- Mini-map for navigation
- Empty state guidance

#### Global Search
- Cross-entity search across all components
- Type filtering (Field, XSLT Variable, XPath, Java Method)
- Results grouped by type with icons
- Real-time search with clear button
- Result metadata display

### Visual Design

#### Color Scheme
- Sidebar: Dark Navy (#082044)
- Primary: Blue (#1267e8)
- Success: Green (#00b96b)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)

#### Animations & Transitions
- ✨ Smooth page transitions (150-350ms)
- 🎯 Button hover effects with elevation
- ⌨️ Input focus animations
- 📑 Tab switch animations
- 🎬 Modal animations
- 🎨 Card hover effects with shadow elevation

#### Components
- Professional sidebar navigation with active states
- Responsive header with breadcrumb navigation
- Accessibility-compliant form inputs
- Color-coded badge system
- Modal dialogs with animations

## Styling

### Tailwind CSS

The project uses Tailwind CSS for styling:

```tsx
<div className="flex gap-4 p-6 bg-white rounded-lg shadow">
  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
    Click me
  </button>
</div>
```

### CSS Variables

Custom colors and spacing defined in `tailwind.config.js`

## State Management

### React Query (Server State)

```tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['fields', search, page],
  queryFn: () => fieldApi.searchFields(search, page),
})
```

Configuration in `src/app/queryClient.ts`:
- 5-minute cache time
- 10-minute garbage collection
- 1 retry with 1-second delay

### useState (Component State)

```tsx
const [search, setSearch] = useState('')
const [page, setPage] = useState(1)
```

### useDebounce (Performance Hook)

```tsx
const debouncedSearch = useDebounce(search, 500)
```

## Routing

Routes are defined in `App.tsx`:

- `/` - Dashboard
- `/fields` - Field Search
- `/fields/:id` - Field 360 View
- `/comparison` - Field Comparison
- `/impact` - Impact Analysis
- `/graph` - Graph Explorer
- `/search` - Global Search

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

```tsx
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText(/text/i)).toBeInTheDocument()
  })
})
```

## Performance

### Optimization Techniques

1. **Search Debouncing**: Input debounced by 500ms
2. **Query Caching**: Automatic response caching by React Query
3. **Code Splitting**: Lazy loaded routes
4. **Image Optimization**: Optimized assets
5. **Component Memoization**: React.memo for expensive components

### Browser DevTools

Monitor performance:
- React DevTools: Identify slow renders
- Network Tab: Monitor API requests
- Performance Tab: Measure load times

## Error Handling

### Error States

The application includes error state components:

```tsx
<ErrorState
  message="Failed to load data"
  onRetry={() => refetch()}
/>
```

### Error Boundaries

Global error handling with error boundaries (can be added)

## Accessibility

- Semantic HTML elements
- ARIA labels for screen readers
- Keyboard navigation support
- Color contrast compliance

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Deployment

### Build for Production

```bash
npm run build
```

Output in `dist/` directory (452KB JS, 24.76KB CSS)

### Docker

```bash
# Build Docker image
docker build -t lineage-frontend:latest .

# Run container
docker run -p 3000:3000 lineage-frontend:latest
```

### Docker Compose (Full Stack)

```bash
# Start all services (frontend + backend + databases)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Accesses all services at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Neo4j Browser: http://localhost:7474

### Environment-Specific Builds

```bash
# Production build
VITE_APP_ENV=production npm run build

# Staging build
VITE_APP_ENV=staging npm run build
```

### See Also

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Full deployment guide
- [SECURITY.md](../SECURITY.md) - Security hardening and best practices

## Troubleshooting

### Port 5173 Already in Use

```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>
```

### API Connection Issues

1. Verify backend is running: `curl http://localhost:8000`
2. Check `.env.local` has correct `VITE_API_BASE_URL`
3. Check browser console for CORS errors
4. Verify backend CORS configuration

### Build Errors

```bash
# Clear node_modules and cache
rm -rf node_modules dist .vite
npm install
npm run build
```

### Hot Reload Not Working

1. Ensure Vite dev server is running
2. Check file changes are saved
3. Restart dev server: `npm run dev`

## Development Tips

### Component Organization

- Keep components focused on single responsibility
- Extract complex logic into custom hooks
- Use TypeScript interfaces for props
- Add JSDoc comments for complex components

### Naming Conventions

- Components: PascalCase (`FieldListPage.tsx`)
- Utilities: camelCase (`fieldApi.ts`)
- Constants: UPPER_SNAKE_CASE
- Hooks: camelCase with `use` prefix (`useDebounce.ts`)

### Git Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Run linter: `npm run lint`
4. Format code: `npm run format`
5. Commit changes
6. Push and create PR

## Contributing

See [DEVELOPMENT.md](../docs/DEVELOPMENT.md) for contribution guidelines.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review component examples in features/
3. Check test files for usage patterns
4. Review API documentation at backend

## License

[License information to be added]

## Version

Version: 0.1.0

Last Updated: May 2026
