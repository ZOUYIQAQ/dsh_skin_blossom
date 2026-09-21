/**
 * Host half of peach-fizz.
 *
 * The skin is a browser-only concern: the 147 `--dsw-*` token overrides and the
 * decorative stylesheet are applied by ./client.js through the ui-theme
 * service. This half exists so the profile's Loader can mount the row and the
 * client-modules roster picks up `dsh.client` from package.json — it registers
 * nothing on the host plane and touches no DOM.
 */
export const name = "peach-fizz";

/** No host-plane services: the row is a pure carrier for the client bundle. */
export const inject = [];

/**
 * No-op host body.
 */
export function apply() {}
