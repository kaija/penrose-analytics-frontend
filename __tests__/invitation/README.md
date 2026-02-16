# Invitation Tests

This directory contains unit tests and property-based tests for the invitation system.

## Running Tests

### Run All Invitation Tests (Recommended)

To avoid database cleanup conflicts between test files, run invitation tests sequentially:

```bash
npm test -- --runInBand __tests__/invitation/
```

### Run Individual Test Files

```bash
# Unit tests only
npm test -- __tests__/invitation/invitation.test.ts

# Property-based tests only
npm test -- __tests__/invitation/invitation.property.test.ts
```

## Test Structure

- `invitation.test.ts` - Unit tests for invitation functionality
  - Invitation creation
  - Email sending
  - Validation
  - Acceptance
  - Resend

- `invitation.property.test.ts` - Property-based tests using fast-check
  - Property 11: Invitation creation invariants
  - Property 12: Email verification on acceptance
  - Property 13: Successful invitation acceptance
  - Property 14: Invitation resend behavior
  - Property 30: Invitation email content
  - Additional properties for token uniqueness, expiration, and field validation

## Important Notes

1. **Sequential Execution**: These tests share a database and must run sequentially to avoid conflicts. Always use `--runInBand` when running both test files together.

2. **Cleanup Strategy**: Both test files use targeted cleanup that tracks created entities and deletes only those entities after each test.

3. **Property-Based Tests**: The property tests run 100 iterations by default. Each iteration creates test data, runs assertions, and cleans up.

## Troubleshooting

If you encounter foreign key constraint errors:
- Ensure you're running tests with `--runInBand` flag
- Check that the database is in a clean state before running tests
- Verify that cleanup hooks are executing properly
