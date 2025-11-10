# Study Oasis TODO (Code Source Of Truth)

> Track feature gaps that still block the PRD, referencing the real implementation instead of stale docs. Keep FE/BE owners in sync.

## 1. Authentication & Session Propagation
- [x] `apps/api/src/auth/*`, `apps/web/lib/api/auth.ts`: expose `/auth/health` to validate Supabase credentials and add diagnostics when creds are missing so deploys fail fast instead of returning silent 401s.
- [x] `apps/web/lib/api/auth.ts`, `apps/web/lib/supabase/*`, `apps/web/middleware.ts`: persist Supabase cookies for SSR and share the access token with both browser/server fetchers so Server Components can call the API with the same credentials as the client.
- [x] `apps/api/src/auth/auth.controller.ts`, `apps/api/src/common/guards/supabase-auth.guard.ts`: ship `/auth/session` (guarded) so the web tier can verify/refresh tokens server-side and hydrate user context without relying on client-only hooks.

## 2. Focus Workflow Completion
- [x] `apps/web/app/chat/components/FocusMode.tsx`, `apps/web/hooks/useFocusSession.ts`, `apps/api/src/focus/focus.service.ts`: persist pause/resume transitions and active duration when the user changes state so analytics and scoring remain accurate.
- [x] `apps/web/app/focus/report/[id]/page.tsx`, `apps/api/src/focus/focus.controller.ts`: render the analytics payload (grade, duration, distraction distribution) in the focus report so users see the same insights the backend computes.
- [x] `apps/web/components/CompleteWorkModal.tsx`, `apps/web/app/chat/components/FocusMode.tsx`: upload real completion proofs through the Upload API and push the resulting `completionProofId` to the Focus API to close the “upload → focus → proof → report” loop.

## 3. Gamification & Retention
- [x] `apps/api/src/gamification/*`, `apps/api/src/focus/dto`, `docs/API_DOCUMENTATION.md`: add `/gamification/progress` that computes streaks, average focus score, badges, and recent sessions on demand.
- [x] `apps/web/app/layout.tsx`, `apps/web/components/Header.tsx`, `apps/api/src/notifications/*`: Reminder banner surfaces streak/active session/completion-proof nudges above all pages so users know what to do next.

## 4. Production Readiness
- [x] `apps/web/package.json`, `.github/workflows/ci.yml`: split Jest unit tests and Playwright e2e suites; e2e must boot Next.js + API against the same Supabase project and polyfill `TransformStream` for Node 20+ to stop CI failures.
- [x] `apps/api/src/config/logger.config.ts`, `monitoring/*.yml`: send structured logs + metrics to the existing Grafana stack and document the dashboards in `docs/implementation/MONITORING_LOGGING_GUIDE.md`, ensuring remote operators—not just local devs—can observe incidents.

## 5. Next Step – Assignment & Proof Lifecycle
- [x] `apps/web/app/chat/hooks/useChatLogic.ts`, `apps/api/src/upload/upload.controller.ts`, `docs/implementation/P3_7_8_COMPLETION_REPORT.md`: link uploaded study materials and completion proofs together so assignments show their latest proof, allowing educators to validate submissions directly from the dashboard.
> ✅ 当前所有数据库操作都假设 Supabase cloud 实例，切勿启动本地 Postgres/migrate dev；使用 `DIRECT_DATABASE_URL` 运维迁移，`DATABASE_URL` 供 Nest 运行。

## 6. Refactoring Wave 1 (P0 Readiness)
- [x] P0-1 – `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`, `apps/api/src/upload/**`: normalize document/OCR column naming (snake_case), drop the misleading `s3Key`, and ensure repositories/services/docs reference the new fields.
- [x] P0-2 – `apps/api/src/focus/focus.service.ts`, `apps/api/src/chat/chat.service.ts`, `apps/api/src/upload/upload.service.ts`: replace `any` buckets with Prisma-generated types so focus/chat/update flows remain type-safe.
- [x] P0-3 – `apps/api/src/common/exceptions/**`, `apps/api/src/common/filters/**`, service layers: introduce `BusinessException` + standardized logging so API errors share one contract.
- [x] P0-4 – `apps/api/src/main.ts`, controllers, DTOs: enable Swagger with module tags + DTO decorators to unblock API consumers and QA.
- [x] P1-5 – refactor `UploadService.saveFile` into focused helpers (validation/storage/metadata/OCR/event tracking), reuse config getters for destination/max size, and keep upload logic testable.
- [x] P1-6 – backfill repository/helper unit tests (DocumentRepository, ConversationRepository, MessageRepository, FileValidatorHelper) so new refactors stay regression-safe.
- [x] P1-7 – extract focus score “magic numbers” into `focus/constants/focus-score.constants.ts` and reuse across scoring + insight generation.
- [x] P1-8 – normalize service-level JSDoc (English summaries, `@param/@returns`) for focus/chat/upload surfaces to unblock API consumers and QA automation.
