## Locked Set study mode

The Darbības Vārdi exercise now has a “Study mode” card (under the main heading) with two radio options:

- **Use all** keeps the legacy behaviour – every “Jauna spēle” pull shuffles the whole pool.
- **Locked set** narrows the exercise to a fixed subset until you click **New mix**.

### Choosing the set size
- When Locked set is active, the **Set size** control exposes presets (10, 20) plus **Custom**.
- Custom size accepts integers ≥ 5. The input clamps to the available pool automatically, and the yellow helper text calls out when the pool is smaller than the requested size.
- The board will display at most the chosen count; if the locked set is smaller, every round reuses the entire set.

### New mix and queue behaviour
- **New mix** draws the requested number of unique IDs from the current (filtered) pool, favouring verbs that did not appear in the last five mixes (`dv_recentSets` ring buffer).
- The mix is shuffled once (Fisher–Yates) and persisted as `dv_activeSet`. A cursor stored in `dv_cursor` remembers the next chunk so sessions resume exactly where they stopped.
- Each press of “Jauna spēle” in Locked mode advances through the ordered set, wrapping back to the beginning after the last item. The indicator shows both the locked size and the next position (`Item N / total`) so it is clear that the queue cycles.

### Mistake prioritisation
- The **Prioritize mistakes** switch (optional) reinserts incorrect answers back into the queue so they reappear within the next ~3 rounds.
- The policy is deterministic: the item is moved a few turns ahead of the current cursor, is limited to two consecutive priority boosts, and never removes other verbs from the queue—everything still loops fairly.
- Stats for every verb (correct/incorrect counters and `lastSeen`) live under the `dv_stats` localStorage key and feed both the priority logic and future analytics.

### Resetting
- **Reset locked set** wipes only Darbības Vārdi data: `dv_activeSet`, `dv_cursor`, `dv_recentSets`, `dv_stats`, and any in-memory priority flags. Use this if the saved set becomes stale or you want to restart from scratch.
- After a reset you can immediately click **New mix** (still inside Locked mode) or fall back to **Use all**.

### Storage summary
| Key | Purpose |
| --- | --- |
| `dv_config` | `{ mode, size, prioritizeMistakes }` for the toggle, size selector, and mistake switch. |
| `dv_activeSet` | Ordered array of stable verb IDs representing the current locked queue. |
| `dv_cursor` | Integer index of the next item to serve inside `dv_activeSet`. |
| `dv_recentSets` | Last five locked sets used for mix variety. |
| `dv_stats` | Map of verb ID → `{ correct, incorrect, lastSeen }`. |

All keys are local to the Darbības Vārdi page and may be safely removed via the Reset button or the browser’s storage inspector.
