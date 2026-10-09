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
mutation, so dragging causes zero React re-renders, with DOM updates batched to the
browser's own paint cycle instead of firing on every raw pointer event.
`pointerup` reads its own event coordinates to compute the final committed value and
dispatches it; `pointercancel` and `lostpointercapture` both revert the DOM mutation
with no dispatch, so an aborted interaction never reaches the reducer. The trash zone's
"armed" highlight is change-gated through a ref comparison so dragging near it doesn't
trigger a re-render on every animation frame.

Automated tests cover the reducer, the geometry/clamping math, and the storage
validator, since that logic is pure and deterministic. Pointer-driven interactions
(move, resize, create, trash-delete, text editing, and `localStorage` round-tripping)
were verified manually in Chrome, Firefox, and Edge.
