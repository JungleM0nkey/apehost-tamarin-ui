---
goal: Interactive Model Selection Wizard with Task-Based Recommendations
version: 1.0
date_created: 2026-01-07
last_updated: 2026-01-07
owner: ApeHost Team
status: Planned
tags: [feature, ui, ux, wizard, model-selection, accessibility]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan defines the roadmap for building an interactive model selection wizard that helps users choose the best model for their task. The wizard provides guided selection through a multi-step interface with explanations of model capabilities, task recommendations, and parameter suggestions.

## Current State Analysis

The existing implementation in [src/components/sidebar/model-selector.tsx](../src/components/sidebar/model-selector.tsx) consists of:
- **Simple dropdown**: Basic model selection with no guidance
- **Model list**: Only displays model IDs from LM Studio
- **No metadata**: No information about model capabilities, sizes, or best use cases
- **No recommendations**: Users must know which model to select

## Target User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│  🧙 Model Selection Wizard                               [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1 of 3: What would you like to do?                       │
│  ─────────────────────────────────────────                     │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  💬 Chat        │  │  📝 Writing     │  │  💻 Coding      │ │
│  │  General        │  │  Creative &     │  │  Development &  │ │
│  │  conversation   │  │  professional   │  │  debugging      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  🔬 Analysis    │  │  🎨 Creative    │  │  🔧 Tools       │ │
│  │  Data & math    │  │  Roleplay &     │  │  Function       │ │
│  │  reasoning      │  │  storytelling   │  │  calling        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Skip]                                    [Next →]            │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: Multi-step wizard dialog for guided model selection
- **REQ-002**: Task category selection (chat, writing, coding, analysis, creative, tools)
- **REQ-003**: Model recommendations based on selected task and available models
- **REQ-004**: Model capability explanations (context length, strengths, best uses)
- **REQ-005**: Model size/performance trade-off guidance
- **REQ-006**: Parameter suggestions based on selected model and task
- **REQ-007**: Quick selection bypass for experienced users
- **REQ-008**: Memory of previous selections for smart defaults
- **REQ-009**: Model metadata parsing from LM Studio model names

### Accessibility Requirements

- **A11Y-001**: Full keyboard navigation through wizard steps
- **A11Y-002**: Screen reader announcements for step changes
- **A11Y-003**: Focus management when opening/closing dialog
- **A11Y-004**: Proper ARIA roles and labels for all interactive elements
- **A11Y-005**: High contrast visual indicators for selection states
- **A11Y-006**: Skip link to bypass wizard for repeat users

### Non-Functional Requirements

- **NFR-001**: Wizard should open in < 100ms
- **NFR-002**: Step transitions should feel instant (< 50ms)
- **NFR-003**: Model metadata lookup should be cached

### Constraints

- **CON-001**: Must work with existing `useChatStore` model selection interface
- **CON-002**: Must use existing Dialog component from `@/components/ui/dialog`
- **CON-003**: Must follow existing design system (amber/brown color palette)
- **CON-004**: Must support models that don't have parseable metadata (graceful fallback)

### Patterns & Guidelines

- **PAT-001**: Use compound component pattern for wizard steps
- **PAT-002**: Use reducer pattern for wizard state management
- **PAT-003**: Use progressive disclosure for advanced options
- **GUD-001**: Follow WCAG 2.2 Level AA for all components

## 2. Implementation Steps

### Implementation Phase 1: Model Metadata System

- GOAL-001: Create infrastructure for parsing and storing model metadata from LM Studio model IDs

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `src/lib/models/model-metadata.ts` with interfaces: `ModelMetadata`, `ModelCapability`, `ModelTask` | | |
| TASK-002 | Implement `parseModelId()` function to extract metadata from model names (e.g., "llama-3.1-8b-instruct" → size, family, variant) | | |
| TASK-003 | Create `src/lib/models/model-catalog.ts` with known model families database (Llama, Mistral, Qwen, DeepSeek, etc.) | | |
| TASK-004 | Implement `getModelCapabilities(modelId)` function to return task suitability scores | | |
| TASK-005 | Create `src/lib/models/task-definitions.ts` with task categories and their requirements | | |
| TASK-006 | Add unit tests for model metadata parsing in `src/lib/models/__tests__/model-metadata.test.ts` | | |

### Implementation Phase 2: Wizard UI Components

- GOAL-002: Build reusable wizard dialog components with full accessibility support

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Create `src/components/wizard/wizard-context.tsx` with wizard state context and reducer | | |
| TASK-008 | Create `src/components/wizard/wizard-dialog.tsx` base component wrapping Dialog | | |
| TASK-009 | Create `src/components/wizard/wizard-step.tsx` step container with animations | | |
| TASK-010 | Create `src/components/wizard/wizard-nav.tsx` navigation footer (Back/Next/Skip) | | |
| TASK-011 | Create `src/components/wizard/wizard-progress.tsx` step progress indicator | | |
| TASK-012 | Add ARIA live region for step change announcements | | |
| TASK-013 | Implement roving tabindex for task category grid selection | | |
| TASK-014 | Export all wizard components from `src/components/wizard/index.ts` | | |

### Implementation Phase 3: Model Wizard Steps

- GOAL-003: Implement the specific wizard steps for model selection flow

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Create `src/components/model-wizard/task-step.tsx` - Step 1: Task category selection grid | | |
| TASK-016 | Create `src/components/model-wizard/model-step.tsx` - Step 2: Recommended models list with explanations | | |
| TASK-017 | Create `src/components/model-wizard/params-step.tsx` - Step 3: Suggested parameters (temp, max_tokens) | | |
| TASK-018 | Create `src/components/model-wizard/model-wizard.tsx` orchestrating all steps | | |
| TASK-019 | Implement model ranking algorithm based on task + available models | | |
| TASK-020 | Add model capability badges (Fast, Large Context, Tool Use, etc.) | | |
| TASK-021 | Create model explanation cards with pros/cons for each recommendation | | |
| TASK-022 | Export model wizard from `src/components/model-wizard/index.ts` | | |

### Implementation Phase 4: Integration & State Management

- GOAL-004: Integrate wizard with existing model selector and chat store

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Add `openModelWizard` action to `useChatStore` | | |
| TASK-024 | Update `ModelSelector` component to show wizard trigger button | | |
| TASK-025 | Implement wizard completion handler to set model + parameters | | |
| TASK-026 | Add localStorage persistence for wizard preferences (last task, skip preference) | | |
| TASK-027 | Create `useModelRecommendations` hook for getting ranked models | | |
| TASK-028 | Add "Recommended" badge to model dropdown for wizard-suggested models | | |

### Implementation Phase 5: Enhanced Model Information

- GOAL-005: Add detailed model information and comparison features

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-029 | Create `src/components/model-wizard/model-details-panel.tsx` expandable details | | |
| TASK-030 | Implement model comparison view (side-by-side 2 models) | | |
| TASK-031 | Add context length visualization (bar showing model vs typical needs) | | |
| TASK-032 | Create performance tier indicators (🐢 Slow, 🐇 Fast, ⚡ Fastest) | | |
| TASK-033 | Add VRAM/memory requirement estimates based on model size | | |
| TASK-034 | Implement "Why this model?" tooltip explaining recommendation reasoning | | |

### Implementation Phase 6: Polish & Testing

- GOAL-006: Final polish, accessibility audit, and comprehensive testing

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-035 | Run Accessibility Insights audit and fix all issues | | |
| TASK-036 | Add keyboard shortcut (Ctrl+Shift+M) to open model wizard | | |
| TASK-037 | Implement smooth step transition animations | | |
| TASK-038 | Add empty state handling when no models match task | | |
| TASK-039 | Create fallback UI for unknown/unparseable model names | | |
| TASK-040 | Add integration tests for full wizard flow | | |
| TASK-041 | Update documentation with wizard usage guide | | |

## 3. Alternatives

- **ALT-001**: **Inline recommendations instead of wizard** - Show recommendations directly in the dropdown without a separate wizard. Rejected because it doesn't provide enough space for explanations and guidance.

- **ALT-002**: **AI-powered model selection** - Use the LLM itself to recommend which model to use. Rejected because it creates a chicken-and-egg problem and adds latency.

- **ALT-003**: **Single-step modal** - Show all options (task, model, params) in one view. Rejected because it's overwhelming for new users and reduces progressive disclosure benefits.

- **ALT-004**: **Floating panel instead of dialog** - Use a slide-out panel. Rejected because dialogs provide better focus management and work better on mobile.

## 4. Dependencies

- **DEP-001**: `@radix-ui/react-dialog` - Already installed, used by Dialog component
- **DEP-002**: `lucide-react` - Already installed, for wizard icons
- **DEP-003**: `zustand` - Already installed, for state management
- **DEP-004**: `framer-motion` (optional) - May be added for step animations

## 5. Files

### New Files

- **FILE-001**: `src/lib/models/model-metadata.ts` - Model metadata types and parsing
- **FILE-002**: `src/lib/models/model-catalog.ts` - Known model families database
- **FILE-003**: `src/lib/models/task-definitions.ts` - Task category definitions
- **FILE-004**: `src/lib/models/index.ts` - Model utilities exports
- **FILE-005**: `src/components/wizard/wizard-context.tsx` - Wizard state context
- **FILE-006**: `src/components/wizard/wizard-dialog.tsx` - Base wizard dialog
- **FILE-007**: `src/components/wizard/wizard-step.tsx` - Step container
- **FILE-008**: `src/components/wizard/wizard-nav.tsx` - Navigation footer
- **FILE-009**: `src/components/wizard/wizard-progress.tsx` - Progress indicator
- **FILE-010**: `src/components/wizard/index.ts` - Wizard exports
- **FILE-011**: `src/components/model-wizard/task-step.tsx` - Task selection step
- **FILE-012**: `src/components/model-wizard/model-step.tsx` - Model selection step
- **FILE-013**: `src/components/model-wizard/params-step.tsx` - Parameters step
- **FILE-014**: `src/components/model-wizard/model-wizard.tsx` - Main wizard component
- **FILE-015**: `src/components/model-wizard/model-details-panel.tsx` - Model details
- **FILE-016**: `src/components/model-wizard/index.ts` - Model wizard exports
- **FILE-017**: `src/hooks/useModelRecommendations.ts` - Recommendations hook

### Modified Files

- **FILE-018**: `src/components/sidebar/model-selector.tsx` - Add wizard trigger
- **FILE-019**: `src/store/chat-store.ts` - Add wizard state actions
- **FILE-020**: `src/components/sidebar/index.ts` - Export new components

## 6. Testing

- **TEST-001**: Unit test model ID parsing for various model name formats
- **TEST-002**: Unit test task-to-capability scoring algorithm
- **TEST-003**: Unit test model ranking/sorting logic
- **TEST-004**: Integration test wizard step navigation (forward, back, skip)
- **TEST-005**: Integration test wizard completion and model selection
- **TEST-006**: Accessibility test screen reader navigation
- **TEST-007**: Accessibility test keyboard-only navigation
- **TEST-008**: E2E test complete wizard flow from trigger to model selected

## 7. Risks & Assumptions

### Risks

- **RISK-001**: Model names from LM Studio may not follow consistent naming conventions, making parsing unreliable. Mitigation: Graceful fallback to showing raw model name without metadata.

- **RISK-002**: Users may find the wizard too slow/annoying. Mitigation: Prominent "Skip" option and localStorage preference to remember choice.

- **RISK-003**: Model capability database may become outdated as new models release. Mitigation: Allow community contributions and implement "Unknown" fallback tier.

### Assumptions

- **ASSUMPTION-001**: Users want guidance when selecting models (validated by user research needed)
- **ASSUMPTION-002**: LM Studio returns model IDs that contain size information (e.g., "8b", "70b")
- **ASSUMPTION-003**: Most users have 3-10 models loaded at any time (affects UI design)
- **ASSUMPTION-004**: The existing Dialog component is sufficient for wizard needs

## 8. Related Specifications / Further Reading

- [LM Studio Model Loading Documentation](https://lmstudio.ai/docs)
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [ARIA Authoring Practices - Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Radix UI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Existing Implementation Plan](./feature-lmstudio-backend-1.md)
