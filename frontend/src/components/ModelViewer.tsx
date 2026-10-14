import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Center, OrbitControls, useGLTF } from '@react-three/drei'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { Model } from '@/lib/types'

/**
 * Renders a location's 3D model, branching on `model.format`:
 * - GLB → React Three Fiber (<Canvas> + useGLTF); Draco is bundled by drei.
 * - SPZ → gaussian-splats-3d's self-contained raw-Three.js Viewer.
 *
 * The whole module is lazy-loaded by ModelViewerDialog so three/drei and the
 * splat library stay off the critical path.
 */
export default function ModelViewer({ model }: { model: Model }) {
  if (model.format === 'SPZ') {
    return <SplatViewer url={model.filePath} />
  }
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} className="h-full w-full">
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      {/* GLB files are local and small — the canvas shows an empty lit scene
          for the brief instant the model loads, then Center scales it to fit. */}
      <Suspense fallback={null}>
        <Center>
          <GlbModel url={model.filePath} />
        </Center>
      </Suspense>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  )
}

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function SplatViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    const viewer = new GaussianSplats3D.Viewer({
      rootElement: container,
      cameraUp: [0, 1, 0],
      initialCameraPosition: [0, 0, 4],
      initialCameraLookAt: [0, 0, 0],
    })

    viewer
      .addSplatScene(url, { showLoadingUI: false })
      .then(() => {
        if (disposed) return
        viewer.start()
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (disposed) return
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Could not load the 3D model')
      })

    return () => {
      disposed = true
      // Async cleanup (disposes renderer, sort worker, canvas) — fire and forget.
      void viewer.dispose()
    }
  }, [url])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      role="status"
      aria-label="Loading 3D model"
    />
  )
}
