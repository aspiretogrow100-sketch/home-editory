# Fix Budget step scroll shift

## Goal
Keep the mobile view fixed when continuing from **Budget / Colour** to **Deals**.

## Change
Apply the existing visible-button anchor behavior to this forward step transition without changing selections or later generation behavior.

## Verification
Test the Budget / Colour Continue action at the current phone size and confirm the button shifts 0px.
