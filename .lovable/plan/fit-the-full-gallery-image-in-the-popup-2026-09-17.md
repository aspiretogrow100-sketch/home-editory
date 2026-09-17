# Fit the full gallery image in the popup

## Change
- Restructure the gallery popup so its header stays fixed and only the product list can scroll.
- Give the design image the remaining visible space and use `object-contain`, preserving its full aspect ratio without cropping or horizontal scrolling.
- Keep the popup within the browser height on desktop and mobile.

## Verification
- Open an unlocked gallery design at desktop and mobile sizes.
- Confirm all four image edges are visible simultaneously and the image area has no scrollbars.
- Run the project development build check.
