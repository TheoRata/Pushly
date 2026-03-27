# Org Comparison Feature — Design Spec

## Overview

Add an org comparison feature to Pushly that lets admins see what's different between two Salesforce orgs (e.g., sandbox vs production) before deploying. Displays a side-by-side view of metadata differences with drill-down into component properties. Users can select differing components and deploy them directly or send them to the deploy wizard.

## User Flow

1. User clicks "Compare" in the nav bar
2. Selects source org and target org from dropdowns
3. Clicks "Compare" — quick metadata inventory runs (2-5 seconds)
4. Side-by-side panels show all metadata, color-coded by status:
   - **Green (New):** exists in source but not target
   - **Yellow (Modified):** exists in both but differs
   - **Red (Deleted):** exists in target but not source
   - **Gray (Unchanged):** identical in both
5. Summary bar shows counts: "3 new · 1 modified · 1 deleted · 48 unchanged"
6. Filter pills toggle visibility: All / New / Modified / Deleted
7. Clicking a component expands to show property-level diff (fetched on demand)
8. Checking components reveals an action bar: [Deploy Selected] [Send to Wizard →]

### Integration with Deploy Wizard

Step 1 of the existing deploy wizard gets a new source option: "From Comparison." This runs the same comparison inline and lets the user pick components from the diff instead of the metadata tree. Selected components pre-populate the deploy wizard's component list, skipping straight to validation.

## Layout

Side-by-side panels:

```
┌──────────────────────────┐  ┌──────────────────────────┐
│ SOURCE: DevSandbox       │  │ TARGET: Production        │
│                          │  │                           │
│ ☐ ✚ Account.Industry__c  │  │ ☐ ✖ Contact.Legacy_Ph__c  │
│ ☐ ~ Lead_Assignment      │  │ ☐ ~ Lead_Assignment       │
│   = Account.Name         │  │   = Account.Name          │
│ ☐ ✚ My_New_Flow          │  │                           │
└──────────────────────────┘  └──────────────────────────┘

[Summary: 2 new · 1 modified · 1 deleted · 1 unchanged]
[All] [New] [Modified] [Deleted]

[☑ 2 selected]  [Deploy Selected]  [Send to Wizard →]
```

Matching components line up across panels. Components only in one org appear with an empty row on the other side.

## Technical Architecture

### Backend

#### New Route: `server/routes/compare.js`

Two endpoints:

**`GET /api/compare/inventory`**

- Query params: `source` (org alias), `target` (org alias)
- Runs `sf org list metadata-types` + `sf org list metadata` on both orgs in parallel
- Returns: `{ source: { components: [...] }, target: { components: [...] }, diff: { new: [...], modified: [...], deleted: [...], unchanged: [...] } }`
- Duration: 2-5 seconds

**`GET /api/compare/detail`**

- Query params: `source` (org alias), `target` (org alias), `type` (metadata type), `name` (component name)
- Retrieves that single component from both orgs into temp workspaces
- Parses key properties from the XML based on type
- Returns: `{ source: { properties }, target: { properties }, diffs: [...changed properties...] }`
- Duration: 1-3 seconds per component

#### New Service: `server/services/compare.js`

Functions:

- `listMetadata(orgAlias)` — wraps `sf org list metadata` with `--json`, returns array of `{ type, fullName, lastModifiedDate }`
- `diffInventories(sourceList, targetList)` — matches by `type + fullName`, computes status (new/modified/deleted/unchanged). Modified detection uses `lastModifiedDate` comparison — if dates differ, mark as modified.
- `getComponentDetail(sourceOrg, targetOrg, type, name)` — retrieves one component from both orgs, passes to property extractor
- `extractProperties(metadataXml, type)` — type-specific property extraction using registry pattern

#### Property Extractor Registry

Map of metadata type → extraction function. Each function reads parsed XML and returns key-value pairs.

Supported types at launch:

| Metadata Type | Properties Extracted |
|---|---|
| Flow | Version, Status (Active/Draft), Process Type, Description |
| CustomField | Field Type, Label, Required, Default Value, Picklist Values |
| CustomObject | Label, Sharing Model, Description |
| ApexClass | API Version, Status, Length (lines) |
| ApexTrigger | API Version, Object, Status |
| Layout | Layout Type, assigned Record Types |
| PermissionSet | Label, License, field/object permission count |
| Profile | License Type, field/object permission count |
| ValidationRule | Active, Error Message, Formula (truncated to 200 chars) |

Unsupported types fall back to: Last Modified Date, API Name, file size difference.

Adding support for a new type means adding one function to the registry — no changes to comparison logic.

### Frontend

#### New Page: `client/src/views/ComparePage.vue`

- Two `OrgDropdown` components (reuse existing) for source and target selection
- "Compare" button triggers inventory fetch
- Side-by-side panels rendered from diff results
- Each row is clickable — triggers detail fetch, expands inline to show property diff
- Checkboxes on differing components (new, modified, deleted)
- Summary bar with counts
- Filter pills (All / New / Modified / Deleted) — toggle visibility
- Action bar appears when components are checked:
  - "Deploy Selected" — triggers validation + deploy from compare page directly
  - "Send to Wizard →" — navigates to deploy wizard with pre-selected components

#### New Composable: `client/src/composables/useCompare.js`

Reactive state and methods:

- `sourceOrg`, `targetOrg` — selected org aliases
- `results` — the diff result (new/modified/deleted/unchanged arrays)
- `loading` — boolean for inventory fetch
- `filter` — current filter (all/new/modified/deleted)
- `selectedComponents` — Set of checked components
- `expandedComponent` — currently expanded component (for detail view)
- `detailLoading` — boolean for detail fetch
- `detailData` — property diff for expanded component
- `compare(source, target)` — calls inventory API
- `fetchDetail(type, name)` — calls detail API
- `filteredResults` — computed, applies current filter to results

#### Router Update

Add route in `client/src/router/index.js`:

```js
{ path: '/compare', name: 'Compare', component: () => import('../views/ComparePage.vue') }
```

#### Nav Update

Add "Compare" tab to `TopNavBar.vue` between "Retrieve" and "Deploy".

#### Deploy Wizard Integration

Modify `DeployPage.vue` Step 1 to accept route query params:

- `/deploy?fromCompare=true&source=DevSandbox&target=Production&components=Flow:Lead_Assignment,CustomField:Account.Industry__c`
- If `fromCompare` is present, skip metadata tree, pre-populate component list, jump to validation step

### WebSocket Integration

The inventory fetch is fast (2-5 seconds) and doesn't need WebSocket streaming. Use a regular REST call with a loading spinner.

The detail fetch is also fast (1-3 seconds per component). Regular REST call.

No WebSocket changes needed for this feature.

## Error Handling

| Scenario | Handling |
|---|---|
| Org auth expired | Show "Reconnect" button next to the org dropdown |
| Thousands of components | Default: hide unchanged, show only diffs. Toggle to show all. Paginate at 100 items per page |
| Metadata type not in inventory | Skip silently. Note at bottom: "X types could not be compared" |
| Detail retrieval fails | Show error inline on that row, don't block other components |
| Same component, different API versions | Show API version as a diffed property |
| User selects deleted components | Warning: "Deploying will NOT remove these from target. Destructive changes coming soon." |
| Source and target are same org | Prevent comparison, show: "Select two different orgs" |
| No differences found | Show success message: "These orgs are in sync! No differences found." |

## Out of Scope (v1)

- Destructive changes deployment (delete components from target)
- Line-by-line XML diff view
- Comparison caching / incremental refresh
- Comparing more than 2 orgs at once
- Auto-refresh / watch mode for continuous comparison

These are future enhancements.

## Testing

- `server/tests/compare.test.js` — unit tests for `diffInventories()` and `extractProperties()` with mock data
- Manual testing against real Salesforce orgs for inventory and detail fetch
- Edge cases: empty orgs, orgs with only unchanged components, large component counts
