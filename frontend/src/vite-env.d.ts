/// <reference types="vite/client" />

// Combined `?worker&url` query isn't covered by Vite's `client` types.
declare module '*?worker&url' {
  const src: string
  export default src
}
