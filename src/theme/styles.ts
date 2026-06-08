// Compiled Tailwind + :host variables, imported as a raw string so it can be
// injected into each component's Shadow DOM via a <style> element. Vite runs the
// PostCSS/Tailwind pipeline on this import and returns the result as a string.
import css from './variables.css?inline';

export const snapsStyles: string = css;
