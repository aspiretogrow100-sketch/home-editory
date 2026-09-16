# Fix first-step scroll shift

## Goal
Keep the mobile page at the exact same visible position when moving from **Type & Room** to the next step, without changing later-step behavior.

## Changes
- Preserve the first step's visible anchor before the taller content is replaced.
- Restore that anchor immediately after step 2 renders, instead of relying only on a stored page offset.
- Keep the existing Continue, Back, and step-pill behavior for all later transitions.

## Verification
- Test at the current mobile viewport.
- Confirm the first Continue tap has no downward movement.
- Confirm later Continue and Back actions still stay in place.
