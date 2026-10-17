// PlayCanvas ships its engine scripts as untyped `.mjs` files (the `./scripts/*`
// export). Declare the two the SPZ viewer uses.

declare module 'playcanvas/scripts/esm/parsers/spz-parser.mjs' {
  import type * as pc from 'playcanvas'
  export class SpzParser {
    constructor(app: pc.AppBase)
    canParse(context: unknown): boolean
    load(
      url: string | { load: string; original: string },
      callback: (err: string | null, data?: unknown) => void,
      asset?: unknown,
    ): void
    open(url: unknown, data: unknown): unknown
  }
}

declare module 'playcanvas/scripts/esm/camera-controls.mjs' {
  import type { Script } from 'playcanvas'
  export const CameraControls: (new (...args: unknown[]) => Script) & { scriptName: string }
}
