# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Authentication & Email Verification Invariant:** Every read (`get`) and write (`create`, `update`, `delete`) to `/workspaces/{workspaceId}` requires an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
2. **Path Variable & ID Integrity Invariant:** `workspaceId` must match `^[a-zA-Z0-9_\-]+$`, be at most 128 characters, and strictly equal `request.resource.data.workspaceId`.
3. **Identity Integrity Invariant:**
   - On `create`, `ownerId` and `lastUpdatedByUid` must both equal `request.auth.uid`.
   - On `update`, `ownerId` and `createdAt` are strictly immutable, and `lastUpdatedByUid` must equal `request.auth.uid`.
4. **Temporal Integrity Invariant:**
   - On `create`, `createdAt == request.time` and `updatedAt == request.time`.
   - On `update`, `updatedAt == request.time` and `createdAt == resource.data.createdAt`.
5. **Volumetric & Schema Guard Invariant:**
   - Exact key allowlist (`workspaceId`, `ownerId`, `lastUpdatedByUid`, `lastUpdatedByName`, `payloadJson`, `syncRevision`, `createdAt`, `updatedAt`). No shadow/ghost fields allowed.
   - `payloadJson` is bounded to `2 <= size <= 950000`.
   - `syncRevision` must be an integer `>= 1`.
6. **No Blanket List Scraping:** `list` queries on `/workspaces` are restricted to documents where `resource.data.ownerId == request.auth.uid`, while direct collaboration uses known `workspaceId` via `get`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write:** `auth = null` attempting `create` on `/workspaces/martia-shared-main` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof:** `auth.token.email_verified = false` attempting `create` -> `PERMISSION_DENIED`.
3. **Owner Spoofing on Create:** `ownerId = "victim-uid"` when `auth.uid = "attacker-uid"` -> `PERMISSION_DENIED`.
4. **LastUpdatedBy Spoofing on Update:** `lastUpdatedByUid = "victim-uid"` when `auth.uid = "attacker-uid"` -> `PERMISSION_DENIED`.
5. **Owner Mutation on Update:** Changing `ownerId` during `update` -> `PERMISSION_DENIED`.
6. **CreatedAt Mutation on Update:** Changing `createdAt` during `update` -> `PERMISSION_DENIED`.
7. **Forged Client Timestamp:** Sending a static or future timestamp instead of `request.time` for `updatedAt` -> `PERMISSION_DENIED`.
8. **Shadow/Ghost Field Injection:** Adding `"isAdmin": true` or `"isVerified": true` to the payload -> `PERMISSION_DENIED`.
9. **Path ID Mismatch:** Creating `/workspaces/room-a` with `data.workspaceId = "room-b"` -> `PERMISSION_DENIED`.
10. **Path ID Poisoning:** Using invalid characters or >128 chars in `workspaceId` -> `PERMISSION_DENIED`.
11. **Oversized Payload (Denial of Wallet):** `payloadJson` exceeding 950,000 characters or empty string -> `PERMISSION_DENIED`.
12. **Delete by Non-Owner:** Collaborator (`uid != resource.data.ownerId`) attempting `delete` -> `PERMISSION_DENIED`.
