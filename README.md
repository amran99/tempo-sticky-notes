# Sticky Notes

A single-page sticky-notes board built with React, TypeScript, and Vite. Create notes by
drawing a rectangle on the canvas, move them by dragging their header, resize from the
bottom-right handle, and delete by dragging a note onto the trash drop zone. Notes also
support inline text editing, a color picker, bring-to-front on interaction, and persist
to `localStorage` across reloads.

## Running

```bash
npm install
npm run dev
```

Open the printed local URL. Desktop browsers only (Chrome, Firefox, Edge), minimum
viewport 1024×768.

## Testing

```bash
npm test
```

Runs unit tests (reducer, geometry, storage) on Vitest. Browser-level interaction
tests (drag/resize/trash-delete behavior that depends on real pointer capture and
DOM timing) run separately via Playwright:

```bash
npm run test:e2e
```

## Building

```bash
npm run build
npm run preview
```

## Architecture

State lives in a single `useReducer` inside `Board`, with no React Context — `Board`
passes `dispatch` directly to each `StickyNote`, which builds its own action objects.
The reducer's immutable update pattern means only the changed note gets a new object
reference, so combined with `React.memo` a note's re-render never touches its siblings.
`localStorage` is read synchronously via `useReducer`'s lazy-init argument and
persisted whenever note state changes, so notes persist across reloads without a
separate load effect.

Move, resize, and create-by-draw all share one pointer-event lifecycle
(`useDragInteraction`): `pointermove` only records the latest delta into a ref, and a
single `requestAnimationFrame` per interaction applies it directly to the DOM via a ref
mutation, so the per-frame updates never trigger a React re-render, with DOM updates
batched to the browser's own paint cycle instead of firing on every raw pointer event.
`pointerup` reads its own event coordinates to compute the final committed value, writes
it to the DOM directly, and dispatches it - the direct write matters because the
committed value can come out numerically equal to the pre-drag value (dragged out and
back), in which case React's style diffing skips reapplying it and a re-render alone
wouldn't reconcile the DOM. `pointercancel` and `lostpointercapture` revert the same way,
with no dispatch at all, so an aborted interaction never reaches the reducer. The trash
zone's "armed" highlight is change-gated through a ref comparison so dragging near it
doesn't trigger a re-render on every animation frame.

Vitest covers the reducer, the geometry/clamping math, and the storage validator,
since that logic is pure and deterministic. Playwright covers interaction paths that
depend on real pointer capture and DOM timing - minimum-size trash deletion,
DOM/React reconciliation after a commit, secondary-button and multi-pointer
rejection, keyboard deletion mid-interaction, and viewport/localStorage resizing.
The full set of pointer-driven interactions (move, resize, create, trash-delete,
text editing, and `localStorage` round-tripping) was additionally verified manually
in Chrome, Firefox, and Edge.
