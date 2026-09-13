# Home page community, benefits, and FAQ

## What will be added
- Add a recent community section immediately after the complete generator area, using the existing public gallery feed so new rooms update automatically.
- Show a compact horizontal carousel on smaller screens and a three-card row on larger screens, with room image, style, item summary, and locked/unlocked status linking to the Gallery.
- Add a clean three-column benefits section for photorealistic rendering, direct Amazon shopping, and shared save/unlock access.
- Add an interactive five-question FAQ accordion using the exact questions and answers provided.

## Technical details
- Reuse the existing `listPublicGallery` server function and React Query cache key; no database changes are needed.
- Keep the current hero, wizard flow, generation results, sidebar, and checkout behavior unchanged.
- Use existing semantic design tokens, Button/Badge/Accordion controls, and responsive overflow scrolling.
- Add FAQ structured data to the home page metadata for search engines, matching the visible FAQ copy.
- Verify the home page, community cards, Gallery links, and FAQ toggles on desktop and mobile.
