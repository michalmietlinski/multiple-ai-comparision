# Legacy Types Removal Plan

## Overview

This document outlines the plan for safely removing the deprecated type files from the `src/types/` directory after the type unification process is complete.

## Current Status

The following files have been marked as deprecated:
- `src/types/chat.types.ts` → Replaced by `src/shared/types/messages.types.ts`
- `src/types/api.types.ts` → Replaced by `src/shared/types/api.types.ts`
- `src/types/components.types.ts` → Replaced by `src/shared/types/components.types.ts`

## Removal Process

### Phase 1: Verification (Current Sprint)

1. **Verify all imports are updated**
   - Run a codebase-wide search for imports from the deprecated files
   - Update any remaining imports to use the shared types

2. **Run TypeScript compiler in strict mode**
   - Ensure there are no type errors related to the shared types
   - Fix any remaining type issues

3. **Run all tests**
   - Verify that all tests pass with the new type structure
   - Update any tests that still use the deprecated types

### Phase 2: Gradual Removal (Next Sprint)

1. **Remove `src/types/components.types.ts` first**
   - This file has the fewest dependencies and is safest to remove
   - Verify application still builds and runs correctly

2. **Remove `src/types/api.types.ts` next**
   - Update any remaining imports
   - Verify application still builds and runs correctly

3. **Remove `src/types/chat.types.ts` last**
   - This file has the most dependencies and should be removed last
   - Verify application still builds and runs correctly

### Phase 3: Final Cleanup

1. **Remove any references to the old types directory**
   - Check for any remaining imports or references
   - Update documentation to reflect the new type structure

2. **Update build configuration**
   - Remove any references to the old types directory in build scripts
   - Update TypeScript configuration if needed

## Timeline

- **Phase 1 (Verification)**: Complete by end of current sprint
- **Phase 2 (Gradual Removal)**: Complete by end of next sprint
- **Phase 3 (Final Cleanup)**: Complete within one week after Phase 2

## Risks and Mitigation

### Risks
- Some imports may be missed during the update process
- External tools or scripts might still reference the old types
- Server-side code may have dependencies on the old types

### Mitigation
- Use TypeScript compiler to catch missing imports
- Run comprehensive tests before and after each removal
- Implement the removal in phases to catch issues early
- Keep a backup of the removed files until the process is complete

## Success Criteria

- All deprecated type files are removed
- Application builds without errors
- All tests pass
- No runtime errors related to types
- Documentation is updated to reflect the new type structure 
