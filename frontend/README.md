# AI Data Analyst Frontend Architecture

This document provides a comprehensive overview of the production-ready frontend architecture built for the AI Data Analyst product.

## 1. Component Architecture

We use a feature-based architecture (Vertical Slices), ensuring scalability, maintainability, and clean separation of concerns.

```text
src/
├── app/                  # Application-wide settings (Layouts, Providers, Routes)
├── components/
│   ├── ui/               # Reusable primitive UI components (shadcn/ui base)
│   └── shared/           # Cross-feature complex components
├── features/             # Feature-based domain boundaries
│   ├── analytics/
│   ├── dashboard/
│   ├── datasets/
│   ├── llm/              # AI Assistant feature slice
│   └── visualizations/
├── lib/                  # Utilities, API client configuration
└── styles/               # Global CSS tokens and resets
```

**Why this matters for a modern startup:**
- Avoids the "monolithic `components/` folder" anti-pattern.
- Scales beautifully to millions of users and hundreds of contributors because domains do not leak.

---

## 2. Props & API Design

### `DatasetUpload` Component
Manages resilient file uploading, chunking logic, and state.

```typescript
// Example Props Design Pattern
export interface DatasetUploadProps {
  // Config
  maxSizeMB?: number;
  acceptedTypes?: string[];
  
  // Callbacks
  onUploadSuccess?: (datasetId: string) => void;
  onUploadError?: (error: Error) => void;
  
  // Customization
  className?: string;
}
```

### `QueryConsole` Component (AI LLM Interface)
Decoupled logic for interacting with the AI Data Analyst.

```typescript
export interface QueryConsoleProps {
  initialQuery?: string;
  datasetId?: string; // Scope the query to a specific dataset context
  onInsightsGenerated?: (insights: InsightData) => void;
}
```

---

## 3. Production-Ready Implementation Highlights

1. **Accessibility First (a11y)**: Built on Radix UI primitives. Keyboard navigation, ARIA attributes, focus management, and screen-reader support are guaranteed.
2. **Edge Cases & Empty States**:
   - `DatasetsPage` has strict drag-and-drop validation rules (e.g. 50MB limits, `.csv` only).
   - `AnalyticsPage` features rich empty states instructing users on how to populate data.
   - `DatasetUpload` gracefully handles "uploading", "error", and "idle" states.
3. **Responsive Design**: Tailwind CSS powers fluid grid systems (`md:grid-cols-3`). Sidebars elegantly collapse on smaller breakpoints.
4. **Resilient Data Visualizations**: Real-time scalable charts powered by `recharts`, using CSS variables to respond to light/dark themes dynamically.

---

## 4. Usage Examples

### AI Assistant (LLM) Integration
```tsx
import { QueryConsole } from "@/features/llm/components/QueryConsole";

// In your view
export function AnalystView() {
  return (
    <div className="max-w-4xl mx-auto h-[500px]">
      <QueryConsole 
        datasetId="123" 
        onInsightsGenerated={(data) => trackAnalytics(data)}
      />
    </div>
  );
}
```

### Dataset Uploader
```tsx
import { DatasetUpload } from "@/features/datasets/components/DatasetUpload";

export function DataManagement() {
  return (
    <DatasetUpload 
      maxSizeMB={100}
      onUploadSuccess={(id) => toast.success(`Dataset ${id} uploaded!`)} 
    />
  );
}
```

---

## 5. Best Practices Enforced

- **Server State vs Client State**: Local state via `useState` for component micro-interactions. Global server cache designed for React Query (`@tanstack/react-query`).
- **Styling**: Strict adherence to utility-first styling (`Tailwind CSS`) combined with `class-variance-authority` (cva) for component variants (e.g., solid vs outline buttons). No inline styles.
- **Strict Typing**: TypeScript `strict: true` prevents undefined runtime bugs.
- **Performance**: Heavy UI assets and routes are split natively by the Vite Bundler. Visualizations (`recharts`) utilize canvas-friendly rendering.
