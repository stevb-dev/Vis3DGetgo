import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Center, OrbitControls } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as pc from 'playcanvas'
import { SpzParser } from 'playcanvas/scripts/esm/parsers/spz-parser.mjs'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Model } from '@/lib/types'

// SPZ v4 attribute streams are ZSTD compressed — register the decoder module once
// (PlayCanvas loads .spz via the gsplat handler + SpzParser; the wasm files live
// in frontend/public/wasm/).
pc.WasmModule.setConfig('ZstdDecoderModule', {
  glueUrl: '/wasm/zstd.wasm.js',
  wasmUrl: '/wasm/zstd.wasm.wasm',
})

/**
 * Renders a location's 3D model, branching on `model.format`:
 * - GLB → React Three Fiber (<Canvas> + GLTFLoader).
 * - SPZ → the PlayCanvas engine (reads SPZ v4 — see the migration note in
 *   docs/implementation-status.md).
 *
 * The whole module is lazy-loaded by ModelViewerDialog so three/drei and the
 * PlayCanvas engine stay off the critical path.
 */
export default function ModelViewer({ model }: { model: Model }) {
  if (model.format === 'SPZ') {
    return <SplatViewer url={model.filePath} />
  }
  return <GlbViewer url={model.filePath} />
}

/**
 * Determinate progress bar + percentage, shared by both renderers. PlayCanvas
 * reports no byte-level progress for a single spz fetch, so the SPZ path uses
 * the indeterminate sweep while it loads.
 */
function ModelLoadProgress({ value, caption, indeterminate }: {
  value: number
  caption?: string
  indeterminate?: boolean
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80">
      <div
        className="relative h-2 w-48 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-primary animate-[indeterminate-sweep_1.4s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <div className="text-sm tabular-nums text-muted-foreground">
        {indeterminate ? (caption ?? 'Loading…') : (caption ?? `${pct}%`)}
      </div>
    </div>
  )
}

function GlbViewer({ url }: { url: string }) {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const markReady = useCallback(() => setReady(true), [])

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} className="h-full w-full">
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.4} />
        {/* ErrorBoundary lives inside the Canvas: useLoader throws into the R3F
            tree, which a DOM-level boundary would never see. */}
        <ErrorBoundary onError={(err) => setError(err?.message || 'Could not load the 3D model')}>
          <Suspense fallback={null}>
            <Center>
              <GlbModel url={url} onProgress={setProgress} onReady={markReady} />
            </Center>
          </Suspense>
        </ErrorBoundary>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
      {!ready && !error && <ModelLoadProgress value={progress} />}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}

function GlbModel({ url, onProgress, onReady }: {
  url: string
  onProgress: (p: number) => void
  onReady: () => void
}) {
  const gltf = useLoader(
    GLTFLoader,
    url,
    undefined,
    (event) => {
      onProgress(event.total > 0 ? event.loaded / event.total : 0)
    },
  )
  // Renders only after the GLB resolves (Suspense suspends until then).
  useEffect(() => {
    onReady()
  }, [onReady])
  return <primitive object={gltf.scene} />
}

function SplatViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)

    const app = new pc.Application(canvas, {
      graphicsDeviceOptions: { antialias: false },
    })
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
    app.setCanvasResolution(pc.RESOLUTION_AUTO)
    app.start()

    const cleanup = () => {
      disposed = true
      app.destroy()
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas)
    }

    const handler = app.loader.getHandler('gsplat')
    if (!handler) {
      setLoading(false)
      setError('GSplat resource handler unavailable')
      return cleanup
    }
    handler.addParser(new SpzParser(app))

    const asset = new pc.Asset('scene', 'gsplat', { url })
    app.assets.add(asset)

    asset.once('load', () => {
      if (disposed) return

      const splat = new pc.Entity('splat')
      const gsplat = splat.addComponent('gsplat', { asset })
      app.root.addChild(splat)

      const camera = new pc.Entity('Camera')
      camera.addComponent('camera', { clearColor: new pc.Color(0.08, 0.08, 0.1) })
      app.root.addChild(camera)

      // Frame the camera on the splat's AABB. The gsplat component is
      // "unified" by default, so `gsplat.instance` is undefined — the bounds
      // must come from `customAabb` (falls through to the resource's
      // parse-time AABB). A degenerate AABB counts as missing.
      const aabb =
        gsplat?.customAabb ?? (asset.resource as { aabb?: pc.BoundingBox } | null)?.aabb ?? null
      const radius = aabb ? aabb.halfExtents.length() : 0
      const center = aabb && radius > 0 ? aabb.center.clone() : new pc.Vec3()
      if (aabb && radius > 0) {
        // True fit: distance that keeps the bounding sphere inside the
        // viewport, limited by the tighter of the vertical fov and the
        // aspect-scaled horizontal fov, with a small margin. Slight elevation
        // gives a 3/4 view instead of a dead-level stare.
        const fov = (((camera.camera?.fov ?? 45) * Math.PI) / 180)
        const aspect = app.graphicsDevice.width / Math.max(1, app.graphicsDevice.height)
        const horizontalHalf = Math.atan(Math.tan(fov / 2) * aspect)
        const halfAngle = Math.min(fov / 2, horizontalHalf)
        const distance = (radius / Math.sin(halfAngle)) * 1.1
        const elevation = (18 * Math.PI) / 180
        camera.setPosition(
          center.x,
          center.y + Math.sin(elevation) * distance,
          center.z + Math.cos(elevation) * distance,
        )
        camera.lookAt(center)
      } else {
        camera.setPosition(0, 0, 2.5)
      }

      const script = camera.addComponent('script')
      script?.create(CameraControls, {
        properties: { focusPoint: center, enableFly: false },
      })

      setLoading(false)
    })

    asset.once('error', (err: string) => {
      if (disposed) return
      setLoading(false)
      setError(err || 'Could not load the 3D model')
    })

    app.assets.load(asset)

    return cleanup
  }, [url])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loading && <ModelLoadProgress value={0} caption="Loading 3D model…" indeterminate />}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
