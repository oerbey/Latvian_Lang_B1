# Travel Tracker Mobile Testing Notes

Date: 2025-10-21

## Test Matrix

| Device / Viewport | Orientation | Browser | Result |
| --- | --- | --- | --- |
| iPhone 14 Pro (390×844) | Portrait | Chrome DevTools Responsive | ✅ Layout stacks vertically, map height scales with clamp() sizing, scoreboard columns collapse.
| iPhone 14 Pro (390×844) | Landscape | Chrome DevTools Responsive | ✅ Landscape media query forces single-column flow; scroll remains available for the control panel.
| iPhone 12/13 (414×896) | Portrait | Chrome DevTools Responsive | ✅ Safe-area padding prevents bottom controls from overlapping home indicator; choice grid adapts.
| iPhone SE (375×667) | Portrait | Chrome DevTools Responsive | ✅ Map honors 240–360px range, controls remain scrollable, text remains readable.

## Manual Checks

- Verified all actionable buttons render with ≥44px tap height (Check, Next, Start, Restart, choice chips).
- Confirmed `travel-panel__content` allows vertical scrolling on narrow screens so feedback and navigation stay reachable.
- Observed no overlap between map/card edges and simulated notch/home indicator after applying `env(safe-area-inset-*)` padding.
- Confirmed choice grid breaks to a single column below 375px while maintaining consistent gap spacing.

## Notes

- Testing performed using Chrome DevTools responsive design mode; run on macOS Sonoma 14 for quick regression triage.
- Recommend validating on physical hardware before release, especially Safari on iOS 15 where `clamp()` support shipped in 15.0.
