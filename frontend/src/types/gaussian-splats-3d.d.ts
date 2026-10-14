// @mkkellogg/gaussian-splats-3d ships no TypeScript types, so declare the
// slice the viewer uses (Viewer construction + addSplatScene/start/dispose).

declare module '@mkkellogg/gaussian-splats-3d' {
  export interface ViewerOptions {
    rootElement: HTMLElement
    cameraUp?: [number, number, number]
    initialCameraPosition?: [number, number, number]
    initialCameraLookAt?: [number, number, number]
    [key: string]: unknown
  }

  export interface SplatSceneOptions {
    showLoadingUI?: boolean
    [key: string]: unknown
  }

  export class Viewer {
    constructor(options: ViewerOptions)
    addSplatScene(path: string, options?: SplatSceneOptions): Promise<void>
    start(): void
    dispose(): Promise<void>
  }
}
