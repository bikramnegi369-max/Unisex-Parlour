---
trigger: model_decision
description: Apply this rule whenever creating, modifying, reviewing, or debugging forms, form fields, form validation, React Hook Form, Zod schemas, multi-step forms, edit forms, dynamic fields, file inputs, or form submission logic.
---

# Forms & Validation Rules

Follow production-grade form development practices for all forms in this project.

The project uses React Hook Form and Zod where appropriate.

## Before Creating a Form

Before creating a new form:

1. Check for existing reusable form components.
2. Check for existing input, select, date picker, file upload, and field components.
3. Check for existing form hooks.
4. Check for existing Zod schemas.
5. Check whether a similar form already exists.
6. Reuse existing patterns and components whenever possible.

Do not create duplicate form components or validation logic.

## React Hook Form

Use React Hook Form for complex forms.

Prefer React Hook Form for forms containing:

- Multiple fields
- Validation
- Conditional fields
- Dynamic fields
- File uploads
- Multi-step workflows
- Complex submission logic

Do not manually manage every field with separate `useState` unless there is a clear reason.

For simple forms, follow the existing project convention.

## Zod

Use Zod for schema-based validation when appropriate.

Keep complex or reusable schemas outside the UI component.

Prefer a structure such as:

```text id="h0k8mt"
features/
  workers/
    schemas/
      worker.schema.ts
```

The schema should describe the actual business requirements.

Do not duplicate the same validation rules in multiple components.

## Type Inference

When using Zod with React Hook Form, prefer deriving form types from the schema where appropriate.

Example:

```ts id="bjf7e4"
const workerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type WorkerFormValues = z.infer<typeof workerSchema>;
```

Avoid maintaining separate form types that can easily become inconsistent with the schema.

## Validation

Validate user input appropriately.

Consider:

- Required fields
- Minimum and maximum lengths
- Email format
- Numeric ranges
- Dates
- File types
- File sizes
- Conditional requirements

Validation messages must be clear and useful.

Prefer:

```text id="8q2h4f"
Email address is required.
```

instead of:

```text id="h5u0ld"
Invalid input.
```

Do not expose internal technical validation errors directly to users.

## Client vs Backend Validation

Frontend validation improves user experience.

It is not a security boundary.

Never assume that passing Zod validation means the request is safe.

The backend remains responsible for final:

- Validation
- Authorization
- Authentication
- Business rules
- Data integrity

Handle backend validation errors gracefully even when frontend validation passes.

## Form Submission

Every asynchronous form submission should:

1. Validate the form.
2. Prevent duplicate submissions.
3. Show a loading state.
4. Call the appropriate API service.
5. Handle success.
6. Handle errors.
7. Provide user feedback.
8. Reset or preserve form state appropriately.

Disable the submit action while the request is in progress when appropriate.

Do not allow accidental double submissions.

## Error Handling

Display validation errors near the relevant fields whenever possible.

For server-side errors:

- Map field-specific errors to the appropriate fields when possible.
- Show general errors using the project's notification or error UI.
- Do not display raw Axios errors.
- Do not expose backend stack traces.

Example:

```text id="5z2c8v"
Unable to create worker. Please try again.
```

is preferable to exposing a raw API error.

## Form State

Handle appropriate states:

- Initial
- Editing
- Submitting
- Success
- Error

Use clear visual feedback.

For submit buttons, prefer states such as:

```text id="w3hz5k"
Create Worker
Creating...
```

rather than leaving the user unsure whether the request was submitted.

## Resetting Forms

Reset forms intentionally.

After successful creation, reset the form only if the UX requires it.

When editing existing data, do not unnecessarily reset user-entered values.

When loading existing data into a form, use the appropriate React Hook Form APIs such as `reset` rather than repeatedly setting individual fields unnecessarily.

## Edit Forms

For edit forms:

1. Load the existing entity.
2. Show an appropriate loading state.
3. Populate the form with existing values.
4. Allow the user to modify values.
5. Validate changes.
6. Submit only when appropriate.
7. Handle success and errors.

Avoid overwriting user-entered values when background data refetches unexpectedly.

## Conditional Fields

For fields that depend on other values:

- Keep conditions clear.
- Validate conditional requirements correctly.
- Avoid unnecessary duplicated state.

Example:

If `employmentType === "contractor"`, then `contractEndDate` may be required.

The UI and schema should remain consistent.

## Dynamic Fields

For repeatable fields, use React Hook Form's appropriate field-array functionality when applicable.

Examples:

- Multiple phone numbers
- Multiple skills
- Project assignments
- Time entries
- Service items

Ensure dynamic fields have stable keys.

Do not use array indexes as React keys when items can be reordered or removed.

## Multi-Step Forms

For multi-step forms:

- Keep form state consistent across steps.
- Validate the appropriate fields at each step.
- Prevent moving forward when required data is invalid.
- Provide clear step indicators.
- Allow users to go back without losing valid input.
- Validate the complete form before final submission.

Do not submit partial data unless the backend explicitly supports draft or partial submissions.

## File Inputs

For file uploads:

- Validate file type.
- Validate file size.
- Provide clear validation messages.
- Show selected file information.
- Provide upload progress when applicable.
- Handle upload failures.
- Clean up object URLs created with `URL.createObjectURL`.

Do not assume frontend file validation is sufficient for security.

The backend must validate uploaded files independently.

## Accessibility

Every form field must have:

- A visible or accessible label.
- Clear error messaging.
- Appropriate input types.
- Keyboard accessibility.

Use semantic form elements.

Associate error messages with their fields when supported by the project's form components.

Do not rely only on color to communicate validation errors.

## Reusable Form Components

Use reusable form components for repeated patterns.

Examples:

- Text input
- Select
- Searchable select
- Date picker
- Time picker
- File input
- Checkbox
- Radio group

Do not create a separate custom input component for every individual form unless the behavior is genuinely different.

## Form Components vs Business Logic

Keep form presentation separate from complex business logic.

Do not put all of the following into one massive form component:

- API implementation
- Complex data transformations
- Global state management
- Multiple unrelated UI sections
- Business rules

Extract meaningful logic into hooks, services, schemas, or utilities when complexity requires it.

## Final Check

Before completing form-related work, verify:

- Existing form components were checked.
- Existing schemas were checked.
- React Hook Form is used appropriately.
- Zod validation is used appropriately.
- Form values are correctly typed.
- Required fields are validated.
- Server-side errors are handled.
- Loading state is shown.
- Duplicate submissions are prevented.
- Success feedback is provided.
- Error feedback is provided.
- Accessibility is considered.
- File inputs are validated when applicable.
- No duplicate validation logic was introduced.
- No unnecessary state was created.
