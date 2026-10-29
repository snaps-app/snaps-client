/// <reference types="vite/client" />

declare module '*.css?inline' {
  const css: string;
  export default css;
}
declare const __SNAPS_VERSION__: string;
