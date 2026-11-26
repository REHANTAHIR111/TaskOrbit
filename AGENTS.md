# Repository Guide

## Project

TaskOrbit is a Laravel 11 application (PHP 8.1+) with a React and TypeScript frontend built by Vite. The backend uses Laravel routes, controllers, Eloquent models, migrations, and services. The frontend entry point is `resources/js/src/App.tsx`, mounted through `resources/views/app.blade.php`.

## Where to work

- `app/Http/Controllers` contains web and API controllers; `app/Services` contains domain services.
- `app/Models` contains Eloquent models. Database changes belong in new files under `database/migrations`; do not edit an already-applied migration to change a schema.
- `routes/` defines web, API, console, and broadcast routes.
- `resources/js/src` contains the React/TypeScript UI; styles and the Blade shell are under `resources/css` and `resources/views`.
- `tests/Feature` contains PHPUnit feature tests. `tests/Support` has standalone MySQL regression helpers; inspect their setup and target database before running them.

## Development conventions

- Follow nearby code patterns and keep changes scoped to the relevant layer. Preserve existing API payloads and frontend/backend behavior unless the task calls for a contract change.
- Use Laravel validation and authorization patterns for request handling; keep database access parameterized through Eloquent or the query builder.
- Match `.editorconfig`: UTF-8, LF endings, four spaces, and final newlines. TypeScript/JavaScript uses the repository Prettier settings (`.prettierrc`): semicolons, single quotes, and a 200-character print width.
- Keep secrets and machine-specific settings in `.env`; never commit them. `.env.example` is the shareable configuration template.

## Useful commands

- Install PHP dependencies: `composer install`
- Install frontend dependencies: `npm install`
- Run the app locally: `php artisan serve` and, in another terminal, `npm run dev`
- Build/type-check frontend assets: `npm run build` (`tsc && vite build`)
- Run the PHPUnit suite: `php artisan test`
- Format PHP with Laravel Pint: `vendor/bin/pint`

Tests use the environment in `phpunit.xml` and `.env`; check the configured database before running tests that may mutate persistent data. Do not run the standalone MySQL regression scripts against a shared or production database.

## AI Agent Efficiency Rules

### Before Making Changes
- Read only the files relevant to the requested task.
- Do not scan the entire repository unless necessary.
- Search for similar existing implementations before creating new code.
- Avoid repeatedly inspecting files already understood in the current task.
- Do not explore unrelated modules.

### Implementation
- Make minimal, focused changes.
- Reuse existing controllers, services, models, hooks and components.
- Do not create unnecessary files, helpers or abstractions.
- Do not refactor unrelated working code.
- Preserve existing UI, API responses and database behavior unless requested.
- Ask before installing packages or introducing new dependencies.

### Testing
- Run only tests relevant to the modified functionality.
- Do not run the full test suite for small changes unless necessary.
- Avoid running database-changing scripts without checking their target database.
- Do not repeat successful checks without a reason.

### Context Management
- Keep explanations and progress updates concise.
- Do not repeat project architecture already documented here.
- Do not dump entire files when a focused section is sufficient.
- If information is missing, inspect the relevant source instead of guessing.

### Completion
- Summarize modified files and important changes.
- Mention tests performed and their results.
- Clearly report anything not completed.

## Strict Task Execution Rules

### File Exploration
- Start by identifying the exact files related to the requested task.
- Search for specific function names, routes, components or database fields.
- Do not recursively inspect the entire project.
- Do not read unrelated documentation or modules.
- Expand file exploration only when the implementation requires it.
- Prefer reading relevant sections instead of entire large files.

### Avoid Repeated Work
- Reuse information already gathered during the current task.
- Do not reopen and reread unchanged files without a specific reason.
- Do not repeat searches that have already identified the required implementation.
- Do not repeat successful commands or tests.

### Efficient Implementation
- Understand the existing implementation and make the change directly.
- Do not produce lengthy investigation reports before implementation.
- Avoid unnecessary planning for straightforward tasks.
- Do not explain every internal step.
- Do not perform unrelated cleanup or improvements.

### Response Efficiency
- Keep progress updates minimal.
- Do not print entire files in responses.
- Provide only a short completion summary.
- Mention only relevant modified files and test results.

## Token Efficiency
- Read only files directly related to the task.
- Never scan the entire repository for simple tasks.
- Do not reread files already inspected unless they have changed.
- Search for existing implementations before creating new ones.
- Avoid unnecessary planning and explanations.
- Make minimal changes without unrelated refactoring.
- Run only relevant tests; avoid unnecessary full builds.
- Keep final responses short.
