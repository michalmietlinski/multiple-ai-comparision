# Type Unification Plan

## Goal
Create a single source of truth for all shared types in the application, eliminating duplicate definitions and resolving TypeScript errors.

## Steps

### 1. Ensure Shared Types are Complete ✅

First, verify that all necessary types are properly defined in the shared directory:

- [x] Ensure `src/shared/types/messages.types.ts` contains complete definitions for:
  - [x] `BaseMessage`
  - [x] `ThreadMessage`
  - [x] `ThreadState`
  - [x] `ThreadStateWithCombinedMessages`
  - [x] `TokenUsage`
  - [x] `ChatUsage` (added as an alias for TokenUsage)

- [x] Ensure `src/shared/types/api.types.ts` contains complete definitions for:
  - [x] `Model`
  - [x] `ApiModel`

- [x] Create `src/shared/types/components.types.ts` for component props:
  - [x] `ThreadedChatProps`
  - [x] `ComparisonFormProps`
  - [x] `ThreadHistoryPanelProps`
  - [x] `SavePromptDialogProps`

### 2. Update Server Types

Update server-side type files to import and extend from shared types:

- [ ] Update `src/server/types/api.types.ts` to:
  - [ ] Import `BaseMessage` and `ThreadMessage` from shared types
  - [ ] Rename `baseMessage` to `BaseMessage` for consistency
  - [ ] Extend shared types as needed for server-specific functionality

- [ ] Update `src/server/types/threads.types.ts` to:
  - [ ] Import `ThreadState` and other message types from shared types
  - [ ] Extend shared types as needed for server-specific functionality

### 3. Update Components ✅

Remove local interface declarations from components and import from shared types:

- [x] Update `src/components/ThreadedComparison.tsx`:
  - [x] Remove local interface declarations for `ChatUsage`, `BaseMessage`, `ThreadMessage`, `ThreadState`
  - [x] Import these types from `../shared/types/messages.types`
  - [x] Import `ApiModel` from `../shared/types/api.types`

- [x] Update `src/components/ThreadedChat.tsx`:
  - [x] Remove local interface declarations for `ChatUsage`, `BaseMessage`, `ThreadMessage`
  - [x] Import these types from `../shared/types/messages.types`
  - [x] Import `ThreadedChatProps` from `../shared/types/components.types`

- [x] Update `src/components/ThreadHistoryPanel.tsx`:
  - [x] Remove local interface declarations for `ThreadHistoryPanelProps`
  - [x] Import `ThreadMessage` from `../shared/types/messages.types`
  - [x] Import `ThreadHistoryPanelProps` from `../shared/types/components.types`

- [x] Update `src/components/ComparisonForm.tsx`:
  - [x] Update import for `ComparisonFormProps` to use shared types

- [x] Update `src/components/SavePromptDialog.tsx`:
  - [x] Update import for `SavePromptDialogProps` to use shared types

### 4. Update Services ✅

Update service implementations to use the shared types:

- [x] Update `src/services/threadService.ts`:
  - [x] Change imports from `../types/chat.types` to `../shared/types/messages.types`
  - [x] Update return types to use `ThreadStateWithCombinedMessages` where appropriate

### 5. Implement Combined Messages

Add support for the `combinedMessages` property:

- [ ] Update `src/server/routes/threads.ts`:
  - [ ] Modify the thread endpoint to generate and include `combinedMessages` in the response
  - [ ] Process messages into a combined format for easier consumption by the UI

### 6. Deprecate Legacy Types ✅

Once all components are updated to use the shared types:

- [x] Add deprecation comments to files in `src/types/`:
  - [x] `src/types/chat.types.ts`
  - [x] `src/types/api.types.ts`
  - [x] `src/types/components.types.ts`
- [x] Create a plan to eventually remove these files (see `legacy-types-removal-plan.md`)

## Implementation Notes

- Make changes incrementally, testing after each major component is updated
- Focus on one type group at a time (message types, then API types)
- Ensure backward compatibility during the transition
- Update tests as needed to reflect the new type structure

## Next Steps

1. Complete the server-side type updates (Step 2)
2. Implement the combined messages functionality (Step 5)
3. Follow the legacy types removal plan to safely remove deprecated files 
