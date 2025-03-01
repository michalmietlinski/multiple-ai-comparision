SESSION: 20240320_typescript_migration

ANALYSIS:
1. Test Setup:
   - Jest + React Testing Library
   - setupTests.js present
   - No existing test files found (will need to migrate test setup)

2. File Structure:
   - React components in src/components/
   - Server-side code in src/server/
   - Main App.js and index.js
   - CSS modules used

3. Dependencies to Add:
   - typescript
   - @types/react
   - @types/react-dom
   - @types/jest
   - @testing-library/react types

CORE TYPES STRUCTURE:

1. API & Provider Types:
```typescript
interface Provider {
  url?: string;
  models: string[];
}

interface ApiConfig {
  id: number;
  name: string;
  provider: string;
  key: string;
  url?: string;
  active: boolean;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  apiId: number;
  url?: string;
}
```

2. Message & Response Types:
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatResponse {
  model: string;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

3. Component Props Types:
```typescript
interface ThreadedChatProps {
  messages: Message[];
  selectedModels: string[];
  loading: Record<string, boolean>;
  layout?: 'stacked' | 'grid';
  fullWidth?: boolean;
}

interface ComparisonFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
  selectedModels: string[];
  availableModels: Model[];
  handleModelToggle: (modelId: string) => void;
  modelsLoading: boolean;
  modelsError: string | null;
  clearForm: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  modelsLocked: boolean;
  history: Message[];
  setHistory: (history: Message[]) => void;
}
```

4. Storage Types:
```typescript
interface SavedPrompt {
  id: string;
  label: string;
  description?: string;
  prompt: string;
  timestamp: string;
  collectionId?: string;
}

interface PromptCollection {
  id: string;
  name: string;
  description?: string;
  prompts: SavedPrompt[];
}
```

MIGRATION PLAN:

1. SETUP [✓]
   - Add TS dependencies [✓]
   - Create tsconfig.json (strict mode) [✓]
   - Update package.json scripts [✓]
   - Create global.d.ts for module declarations [✓]

2. CORE TYPES [IN PROGRESS]
   - Create types/ directory [✓]
   - Create api.types.ts (Provider, ApiConfig, Model) [✓]
   - Create chat.types.ts (Message, ChatResponse) [✓]
   - Create components.types.ts (component props) [✓]
   - Create storage.types.ts (SavedPrompt, PromptCollection) [✓]

3. COMPONENT MIGRATION (in order):
   [✓] ThemeToggle.tsx (simplest component)
   [✓] ResponseGrid.tsx
   [✓] HistoryPanel.tsx
   [✓] SavePromptDialog.tsx
   [✓] ComparisonForm.tsx
   [✓] ThreadedChat.tsx
   [✓] ThreadedComparison.tsx
   [✓] ApiManager.tsx
   [✓] PromptManager.tsx
   [✓] App.tsx

4. SERVER MIGRATION:
   [  ] providerConfig.ts
   [  ] directoryManager.ts
   [  ] apiService.ts
   [  ] health.ts
   [  ] server.ts

5. TEST SETUP:
   [  ] Migrate setupTests.js to .ts
   [  ] Add jest.config.ts
   [  ] Update test scripts

VALIDATION POINTS:
- After each component migration: npm run build
- After server migration: npm run server
- After full migration: full E2E test

STATE MARKERS:
- Last completed step: Migrated ApiManager component to TypeScript
- Current phase: Component Migration
- Next up: App.tsx
- Last validated build: TypeScript checking passed 

## TypeScript Migration Plan

### Components to Migrate
- [x] ComparisonForm.tsx
- [x] ThreadedChat.tsx
- [x] ThreadedComparison.tsx
- [x] ApiManager.tsx
- [x] PromptManager.tsx
- [x] App.tsx

### State Markers
- Last completed: App.tsx
- Current phase: Component migration completed
- Next up: Server migration

### Notes
- All type definitions are being maintained in types/ directory
- Components are being migrated one at a time
- Each component is tested after migration
- CSS files don't need migration 

## Server Migration Plan

### Phase 1: Setup ✓
- [x] Create `src/server` directory
- [x] Move server files to `src/server`
- [x] Update `tsconfig.json` for server compilation
- [x] Create server-specific types in `src/server/types`

### Phase 2: Route Migration
- [x] Migrate `health.js` → `health.ts`
- [x] Migrate `changelog.js` → `changelog.ts`
- [x] Migrate `models.js` → `models.ts`
- [x] Migrate `logs.js` → `logs.ts`
- [x] Migrate `provider-apis.js` → `provider-apis.ts`
- [x] Migrate `prompts.js` → `prompts.ts`
- [x] Migrate `collections.js` → `collections.ts`
- [x] Migrate `threads.js` → `threads.ts`

### Phase 3: Services Migration
- [x] Migrate directory manager
- [x] Migrate API providers
- [x] Migrate thread service
- [x] Migrate storage utilities
  - [x] Create storage.ts with common operations
  - [x] Add type-safe file operations
  - [x] Add error handling with TypeScript types
- [x] Add type definitions for environment variables

### Phase 4: Types Migration
- [x] Create `api.types.ts`
  - [x] ApiModel interface
  - [x] ApiProvider interface
  - [x] ThreadMessage interface
  - [x] Thread interface
  - [x] SavedPrompt interface
  - [x] PromptCollection interface
- [x] Create `threads.types.ts`
  - [x] ThreadHistoryResponse
  - [x] ThreadsListResponse
  - [x] ThreadChatRequest
  - [x] ChatResponse
- [x] Create `thread.service.types.ts`
  - [x] ThreadHistoryResult
  - [x] ThreadSummary
  - [x] ThreadChatSaveResult
  - [x] ThreadMigrationResult
- [x] Create storage types
  - [x] StorageOptions interface
  - [x] Generic type parameters for file operations

### Phase 5: Configuration Migration
- [x] Migrate `providerConfig.js` → `providerConfig.ts`
- [ ] Create environment type definitions
- [ ] Add type-safe configuration validation

### Phase 6: Testing
- [ ] Set up Jest with TypeScript
- [ ] Add type definitions for test utilities
- [ ] Migrate existing tests to TypeScript
- [ ] Add new type-safe test helpers

### Remaining Issues
1. Missing type declarations for external modules:
   - [x] `uuid` - installed @types/uuid
   - [ ] Other dependencies need type checking

2. Type safety improvements needed:
   - [ ] Add strict null checks
   - [ ] Add strict function types
   - [ ] Add strict property initialization

3. Linting and Code Quality:
   - [ ] Configure ESLint for TypeScript
   - [ ] Add TypeScript-specific rules
   - [ ] Set up Prettier for TypeScript

### State Markers
- Last completed: Storage utilities migration with proper types
- Current phase: Services Migration completed
- Next step: Set up TypeScript testing infrastructure

### Validation Status
- TypeScript checking: Partial (some type errors remain)
- Build status: Not tested
- Test coverage: Not implemented
