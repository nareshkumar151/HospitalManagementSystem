/**
 * Google's Website Translator widget (see components/layout/LanguageSwitcher) rewrites text nodes directly
 * in the live DOM - it wraps translated text in its own <font> tags via a MutationObserver - which races
 * with React's own DOM patches on those same nodes. The classic symptom is a whole-app crash the moment a
 * translated route unmounts: "Failed to execute 'removeChild'/'insertBefore' on 'Node': The node to be
 * removed/before which the new node is to be inserted is not a child of this node."
 *
 * This is the standard community workaround: make removeChild/insertBefore no-ops (logging a warning
 * instead of throwing) when the DOM has already moved out from under React, rather than letting React's
 * reconciler crash the whole app over a node Google Translate already touched.
 *
 * Call once, before the app renders (see main.tsx) - safe to call more than once (idempotent).
 */
let patched = false

export function applyGoogleTranslateDomPatch(): void {
  if (patched || typeof Node !== 'function' || !Node.prototype) return
  patched = true

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn('[hms] Skipped removeChild: node was already moved (likely by Google Translate).')
      return child
    }
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[hms] Skipped insertBefore: reference node was already moved (likely by Google Translate).')
      return newNode
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}
