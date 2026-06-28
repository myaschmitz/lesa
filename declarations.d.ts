// Ambient declarations for non-code side-effect imports.
// `src/constants/theme.ts` imports `@/global.css` for web styling; without this
// TypeScript can't resolve the CSS side-effect import.
declare module '*.css';
