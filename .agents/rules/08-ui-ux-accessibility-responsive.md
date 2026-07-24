---
trigger: model_decision
description: Apply when creating or modifying UI components, layouts, dashboards, forms, modals, drawers, navigation, responsive designs, accessibility, loading states, empty states, error states, or user interactions.
---

# UI/UX, Accessibility & Responsive Design Rules

Build polished, consistent, accessible, and responsive interfaces suitable for a production ERP application.

Always follow the project's existing design system and reusable UI components.

## Before Creating UI

Before creating new UI:

1. Inspect existing reusable components.
2. Check existing design patterns.
3. Check existing spacing, typography, colors, and interaction patterns.
4. Reuse existing buttons, inputs, modals, drawers, tables, cards, and notifications.
5. Follow the existing project's visual language.

Do not introduce a new visual style for an individual feature.

Do not create duplicate UI components when an existing component can be reused.

## Component Design

Components should have a clear responsibility.

Keep presentation separate from complex business logic.

Avoid unnecessarily large components.

Extract meaningful reusable components when:

- UI is repeated.
- Behavior is repeated.
- A section has significant complexity.
- A component represents a meaningful domain concept.

Do not split simple JSX into excessive micro-components.

## Visual Consistency

Maintain consistent:

- Typography
- Font sizes
- Font weights
- Spacing
- Border radius
- Shadows
- Colors
- Icons
- Button styles
- Input styles
- Hover states
- Focus states
- Error states
- Success states

Follow existing design tokens and Tailwind conventions.

Do not introduce arbitrary colors or inconsistent spacing without a clear reason.

## Responsive Design

Build interfaces for:

- Mobile
- Tablet
- Desktop
- Large desktop

Use a mobile-first approach where appropriate.

Avoid fixed widths that cause horizontal overflow.

Use responsive Tailwind utilities consistently.

Test layouts at different viewport sizes.

Ensure important content and actions remain accessible on smaller screens.

## Responsive Tables

For tables on smaller screens, use an appropriate strategy:

- Horizontal scrolling
- Responsive column visibility
- Priority columns
- Alternative card layout

Do not allow important actions to become inaccessible on mobile.

## Forms

Forms must be easy to understand and complete.

Use:

- Clear labels
- Logical grouping
- Helpful placeholders when appropriate
- Clear validation messages
- Visible required indicators when needed
- Appropriate input types

Do not rely on placeholders as the only field labels.

## Buttons

Use buttons for actions.

Use links for navigation.

Buttons should have clear labels describing the action.

Prefer:

```text id="z8lq6c"
Create Worker
Save Changes
Delete Worker
View Details
```

over vague labels such as:

```text id="1i7s4c"
Click Here
Submit
Action
```

when a more descriptive label is possible.

## Button States

Interactive buttons should handle appropriate states:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading

During asynchronous operations:

- Show loading feedback.
- Prevent duplicate actions.
- Disable the button when appropriate.

Do not leave users uncertain whether an action was triggered.

## Loading States

Every asynchronous UI operation should have a suitable loading state.

Use:

- Skeletons for content loading.
- Spinners for short operations.
- Button loading states for actions.
- Progress indicators for long-running operations.

Prefer localized loading indicators.

Do not block the entire application for a small localized operation.

## Empty States

Provide meaningful empty states when there is no data.

Differentiate between:

- No data exists.
- No search results.
- No filter results.
- No permission to view data.

Where appropriate, provide a useful action.

Examples:

```text id="xq73u6"
No workers found.
[Add Worker]
```

or:

```text id="oq3h1t"
No workers match your filters.
[Clear Filters]
```

Avoid generic empty states that do not explain what happened.

## Error States

Handle errors gracefully.

Show user-friendly messages.

Do not expose:

- Stack traces
- Axios errors
- Backend implementation details
- Internal server messages

Provide retry actions when appropriate.

Example:

```text id="nj57yb"
Unable to load workers.
[Try Again]
```

## Success Feedback

After successful actions, provide appropriate feedback.

Use the project's existing toast or notification system.

Avoid unnecessary success messages for trivial interactions.

Success feedback should clearly communicate what happened.

Example:

```text id="qg0w3j"
Worker created successfully.
```

## Modals

Use modals for focused tasks requiring user attention.

Examples:

- Confirm destructive actions
- Short forms
- Important decisions

Do not put complex multi-step workflows into small modals.

For complex forms, prefer a dedicated page or drawer when appropriate.

Modals should:

- Have a clear title.
- Have an accessible label.
- Support keyboard navigation.
- Support Escape when appropriate.
- Prevent accidental interaction with the background when appropriate.
- Restore focus appropriately.

## Drawers

Use drawers for contextual workflows that benefit from preserving the current page.

Examples:

- Filters
- Quick edit forms
- Details panels

Do not use drawers for every interaction.

Follow existing drawer behavior and animations.

## Destructive Actions

For destructive actions:

- Clearly identify the action.
- Use confirmation when appropriate.
- Explain the consequence when necessary.
- Show loading state.
- Prevent duplicate submissions.
- Handle errors.

Avoid ambiguous destructive buttons.

## Accessibility

Use semantic HTML.

Prefer native elements whenever possible.

Use:

- `<button>` for actions.
- `<a>` or Next.js `<Link>` for navigation.
- `<form>` for forms.
- Proper heading hierarchy.
- Proper labels for inputs.

Do not use clickable `<div>` elements when a button is appropriate.

## Keyboard Accessibility

All interactive functionality should be usable with a keyboard.

Ensure:

- Focus is visible.
- Interactive elements are reachable.
- Keyboard navigation works logically.
- Modals and drawers manage focus appropriately.
- Escape works where expected.

Do not remove browser focus outlines without providing an accessible replacement.

## Screen Readers

Provide meaningful accessible names for interactive elements.

Icon-only buttons must have accessible labels.

For example:

```tsx id="q07scx"
<button aria-label="Delete worker">
```

Do not rely solely on icons to communicate meaning.

## Color and Contrast

Do not rely only on color to communicate information.

Use additional indicators such as:

- Text
- Icons
- Labels
- Patterns

Ensure sufficient contrast for readable content and interactive controls.

## Icons

Use the project's existing icon library.

Do not introduce multiple icon libraries unnecessarily.

Icons should support the meaning of the UI.

Avoid decorative icons that create unnecessary visual noise.

Icon-only actions must have accessible labels.

## Notifications

Use the project's existing toast or notification system.

Do not use browser `alert()` for production UI.

Notifications should:

- Be concise.
- Clearly communicate the result.
- Avoid excessive repetition.
- Use appropriate success, error, warning, or informational states.

## UX Consistency

Similar actions should behave consistently throughout the application.

For example:

- All delete actions should follow a consistent confirmation pattern.
- All forms should use consistent submission feedback.
- All tables should use consistent pagination.
- All API errors should use consistent messaging.

Do not create feature-specific interaction patterns when an established pattern already exists.

## Final Check

Before completing UI work, verify:

- Existing components were reused where appropriate.
- Design patterns are consistent.
- Desktop layout works correctly.
- Mobile layout works correctly.
- Tablet layout works correctly.
- Loading state is handled.
- Empty state is handled.
- Error state is handled.
- Success feedback is handled where appropriate.
- Buttons have appropriate states.
- Destructive actions are handled safely.
- Keyboard accessibility is considered.
- Focus states are visible.
- Icon-only controls have accessible labels.
- Semantic HTML is used.
- No unnecessary visual complexity was introduced.
