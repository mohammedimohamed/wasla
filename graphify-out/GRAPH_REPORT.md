# Graph Report - smofe  (2026-05-02)

## Corpus Check
- 122 files · ~112,529 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 432 nodes · 623 edges · 21 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `getSession()` - 76 edges
2. `useTranslation()` - 16 edges
3. `decryptMetadata()` - 9 edges
4. `fetchData()` - 8 edges
5. `getDb()` - 8 edges
6. `useFormConfig()` - 8 edges
7. `encryptMetadata()` - 8 edges
8. `markLeadSynced()` - 7 edges
9. `generateVCard()` - 7 edges
10. `useTrackDownload()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getSession()`  [INFERRED]
  app\api\auth\route.ts → lib\auth.ts
- `getDashboardV2Data()` --calls--> `getSession()`  [INFERRED]
  app\actions\dashboard.ts → lib\auth.ts
- `AdminPage()` --calls--> `getSession()`  [INFERRED]
  app\admin\page.tsx → lib\auth.ts
- `updateUserAction()` --calls--> `getSession()`  [INFERRED]
  app\admin\users\actions.ts → lib\auth.ts
- `updateUserAction()` --calls--> `getPublicUploadDir()`  [INFERRED]
  app\admin\users\actions.ts → lib\storage.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (37): finalizePasswordResetAction(), AdminPage(), GET(), GET(), POST(), GET(), PUT(), GET() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (12): SyncStatusIcon(), useTranslation(), getAllFields(), getArrayFieldNames(), getRequiredFieldNames(), getTableFields(), useFormConfig(), useSyncStatus() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (25): handleFileUpload(), handleMediaUpload(), handleSave(), handleSaveTemplate(), loadTemplates(), updateBlock(), bulkCreateUsersAction(), bulkDeactivateUsersAction() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (22): DELETE(), GET(), PUT(), applyToField(), decrypt(), decryptMetadata(), encrypt(), encryptMetadata() (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (14): onFormSubmit(), enterFullscreen(), handleMarketingMode(), handleStartKiosk(), onSubmit(), clearOfflineLeads(), getDb(), getOfflineLeads() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (8): getAnalyticsDashboardAction(), logVisitAction(), AnalyticsTracker(), getOrCreateSession(), parseBrowser(), parseDevice(), useTrackDownload(), FileDownloadBlock()

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (8): getDashboardV2Data(), GET(), fetchData(), handleLogout(), generateVCard(), getVCardFilename(), vcEscape(), GET()

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (14): bufToHex(), cacheAuthSession(), clearCachedAuth(), deriveKey(), generateSalt(), getCachedSession(), getDb(), hexToBuf() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (7): createLead(), getDeviceId(), getLead(), refreshRewards(), updateLead(), WaslaDB, fetchLead()

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (12): addField(), addOption(), addPage(), addSection(), deleteField(), newField(), newPage(), newSection() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (5): executeMerge(), fetchData(), handleRecalculate(), handleReleaseReward(), handleRevertMerge()

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (4): SecureAccountModal(), SessionGuard(), SwRegistrar(), ThemeProvider()

### Community 12 - "Community 12"
Cohesion: 0.32
Nodes (4): GET(), POST(), PUT(), createSession()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (2): handleUpload(), loadData()

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (2): fetchStats(), handlePrintGenerator()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (5): DELETE(), GET(), POST(), PUT(), requireAdmin()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (5): DELETE(), GET(), POST(), PUT(), requireAdmin()

### Community 18 - "Community 18"
Cohesion: 0.7
Nodes (4): fetchTeams(), handleAddMember(), handleAssignLeader(), handleCreateTeam()

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (4): NFC Digital Profile, Rewards Engine, Wasla Lead Collector, Kiosk Mode

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (3): Data Safety & Snapshots, Golden Record, QC Dashboard

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (2): Background Sync, Lead Capture Flow

## Knowledge Gaps
- **6 isolated node(s):** `NFC Digital Profile`, `Kiosk Mode`, `Background Sync`, `Lead Capture Flow`, `Data Safety & Snapshots` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (7 nodes): `page.tsx`, `deleteAsset()`, `handleUpload()`, `loadData()`, `moveAsset()`, `saveSettings()`, `syncOfflineCache()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `page.tsx`, `fetchStats()`, `handleDownload()`, `handleLogout()`, `handlePrintGenerator()`, `handlePrintList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `Background Sync`, `Lead Capture Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSession()` connect `Community 0` to `Community 2`, `Community 3`, `Community 6`, `Community 12`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.399) - this node is a cross-community bridge._
- **Why does `useTranslation()` connect `Community 1` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 10`?**
  _High betweenness centrality (0.342) - this node is a cross-community bridge._
- **Why does `getDashboardV2Data()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **Are the 45 inferred relationships involving `getSession()` (e.g. with `finalizePasswordResetAction()` and `getDashboardV2Data()`) actually correct?**
  _`getSession()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useTranslation()` (e.g. with `LeadsListPage()` and `SyncStatusIcon()`) actually correct?**
  _`useTranslation()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `decryptMetadata()` (e.g. with `GET()` and `PUT()`) actually correct?**
  _`decryptMetadata()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `NFC Digital Profile`, `Kiosk Mode`, `Background Sync` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._