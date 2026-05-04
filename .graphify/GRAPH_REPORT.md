# Graph Report - .  (2026-05-04)

## Corpus Check
- 134 files · ~135 325 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 437 nodes · 578 edges · 21 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 134 · Candidates: 337
- Excluded: 126 untracked · 31771 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.
## God Nodes (most connected - your core abstractions)
1. `fetchData()` - 8 edges
2. `getDb()` - 8 edges
3. `fetchData()` - 5 edges
4. `newSection()` - 5 edges
5. `requireAdmin()` - 5 edges
6. `requireAdmin()` - 5 edges
7. `deriveKey()` - 5 edges
8. `getDb()` - 5 edges
9. `isCipherFormat()` - 5 edges
10. `uid()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `GET()`  [EXTRACTED]
  app/api/admin/mediashow/route.ts → app/api/mediashow/route.ts
- `DELETE()` --calls--> `GET()`  [EXTRACTED]
  app/api/admin/mediashow/route.ts → app/api/mediashow/route.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), PUT(), GET() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (4): getOrCreateSession(), parseBrowser(), parseDevice(), useTrackDownload()

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (5): fetchLead(), handleToggleStatus(), enterFullscreen(), handleMarketingMode(), handleStartKiosk()

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (7): getAllFields(), getArrayFieldNames(), getRequiredFieldNames(), getTableFields(), fetchRewards(), handleDelete(), onSubmit()

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (13): applyToField(), decrypt(), decryptMetadata(), encryptMetadata(), forceEncryptMetadata(), getSensitiveFields(), isActuallyEncrypted(), isCipherFormat() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (3): handleLogout(), generateVCard(), vcEscape()

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (3): createLead(), getDeviceId(), WaslaDB

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (13): bufToHex(), cacheAuthSession(), clearCachedAuth(), deriveKey(), generateSalt(), getCachedSession(), getDb(), hexToBuf() (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (12): addField(), addOption(), addPage(), addSection(), deleteField(), newField(), newPage(), newSection() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (9): clearOfflineLeads(), getDb(), getOfflineLeads(), getPendingCount(), markLeadFailed(), markLeadSynced(), migrateLegacyQueue(), retryFailedLeads() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (5): handleFileUpload(), handleMediaUpload(), handleSaveTemplate(), loadTemplates(), updateBlock()

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (9): fetchBranding(), fetchData(), handleAssignTeam(), handleBulkDeactivate(), handleDelete(), handleResetPin(), init(), onEditSubmit() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.21
Nodes (5): executeMerge(), fetchData(), handleRecalculate(), handleReleaseReward(), handleRevertMerge()

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (3): fetchLeads(), handleToggleStatus(), init()

### Community 15 - "Community 15"
Cohesion: 0.28
Nodes (3): DELETE(), GET(), POST()

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (2): handleUpload(), loadData()

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (2): fetchStats(), handlePrintGenerator()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (5): DELETE(), GET(), POST(), PUT(), requireAdmin()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (5): DELETE(), GET(), POST(), PUT(), requireAdmin()

### Community 21 - "Community 21"
Cohesion: 0.7
Nodes (4): fetchTeams(), handleAddMember(), handleAssignLeader(), handleCreateTeam()

### Community 23 - "Community 23"
Cohesion: 0.83
Nodes (3): GET(), PUT(), requireAdmin()

## Knowledge Gaps
- **Thin community `Community 16`** (2 nodes): `handleUpload()`, `loadData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `fetchStats()`, `handlePrintGenerator()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 9` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._