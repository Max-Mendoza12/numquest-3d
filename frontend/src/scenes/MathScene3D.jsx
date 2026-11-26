import { useMemo } from 'react'
import { OrbitControls, Line, Text, Grid } from '@react-three/drei'
import * as THREE from 'three'

export default function MathScene3D({ category, result, titleLabel }) {
  // Puntos para raíces / iteraciones
  const iterPoints = useMemo(() => {
    if (!result?.iterations?.length) return []
    return result.iterations.map((it, idx) => {
      const xVal = it.root_approx ?? it.x_real ?? it.r ?? 0
      const yVal = it.fx ?? it.x_imag ?? it.s ?? 0
      const zDepth = (idx - result.iterations.length / 2) * 0.16
      return {
        pos: [
          THREE.MathUtils.clamp(xVal, -6, 6),
          THREE.MathUtils.clamp(yVal, -4, 4),
          zDepth,
        ],
        label: `#${it.iter}: ${Number(xVal).toFixed(4)}`,
      }
    })
  }, [result])

  // Curva suave para interpolación
  const curveCoords = useMemo(() => {
    if (!result?.curve_points?.length) return []
    return result.curve_points.map((pt) => [
      THREE.MathUtils.clamp(pt.x, -6, 6),
      THREE.MathUtils.clamp(pt.y, -4, 4),
      0,
    ])
  }, [result])

  // Nodos de integración o derivación
  const calcNodes = useMemo(() => {
    const raw = result?.nodes || result?.evaluated_nodes || result?.gauss_nodes || []
    return raw.map((n) => ({
      x: THREE.MathUtils.clamp(n.x ?? n.x_mapped ?? 0, -6, 6),
      y: THREE.MathUtils.clamp(n.y ?? n.fx ?? 0, -4, 4),
    }))
  }, [result])

  // Trayectoria EDO (t, y)
  const odeCoords = useMemo(() => {
    if (!result?.trajectory?.length) return []
    return result.trajectory.map((pt) => [
      THREE.MathUtils.clamp(pt.t, -6, 6),
      THREE.MathUtils.clamp(pt.y, -4, 4),
      0,
    ])
  }, [result])

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 6]} intensity={1.3} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.28}
        zoomSpeed={0.45}
        panSpeed={0.35}
        minDistance={3.5}
        maxDistance={22}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.85}
      />

      <Grid
        position={[0, -2.2, 0]}
        args={[16, 16]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={2}
        sectionThickness={1.2}
        sectionColor="#38bdf8"
        fadeDistance={20}
      />

      {/* Ejes cartesianos 3D */}
      <Line points={[[-6.5, 0, 0], [6.5, 0, 0]]} color="#64748b" lineWidth={1.5} />
      <Line points={[[0, -4.5, 0], [0, 4.5, 0]]} color="#64748b" lineWidth={1.5} />

      <Text position={[0, 3.4, -0.5]} fontSize={0.24} color="#38bdf8" maxWidth={10}>
        {titleLabel}
      </Text>

      {/* 1. VISUALIZACIÓN DE RAÍCES Y POLINOMIOS */}
      {iterPoints.length > 0 && (
        <>
          {iterPoints.length > 1 && (
            <Line points={iterPoints.map((p) => p.pos)} color="#f59e0b" lineWidth={2.5} />
          )}
          {iterPoints.map((pt, idx) => {
            const isLast = idx === iterPoints.length - 1
            return (
              <group key={idx} position={pt.pos}>
                <mesh>
                  <sphereGeometry args={[isLast ? 0.15 : 0.08, 24, 24]} />
                  <meshStandardMaterial
                    color={isLast ? '#10b981' : '#f59e0b'}
                    emissive={isLast ? '#059669' : '#d97706'}
                    emissiveIntensity={0.65}
                  />
                </mesh>
                {(isLast || idx === 0 || iterPoints.length <= 8) && (
                  <Text position={[0, 0.24, 0]} fontSize={0.13} color={isLast ? '#34d399' : '#e2e8f0'}>
                    {pt.label}
                  </Text>
                )}
              </group>
            )
          })}
        </>
      )}

      {/* 2. VISUALIZACIÓN DE INTERPOLACIÓN */}
      {curveCoords.length > 1 && (
        <>
          <Line points={curveCoords} color="#38bdf8" lineWidth={3} />
          {result?.y_eval !== undefined && (
            <group
              position={[
                THREE.MathUtils.clamp(result.x_eval, -6, 6),
                THREE.MathUtils.clamp(result.y_eval, -4, 4),
                0.05,
              ]}
            >
              <mesh>
                <sphereGeometry args={[0.16, 24, 24]} />
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
              </mesh>
              <Text position={[0, 0.28, 0]} fontSize={0.16} color="#34d399">
                {`P(${result.x_eval}) = ${Number(result.y_eval).toFixed(4)}`}
              </Text>
            </group>
          )}
        </>
      )}

      {/* 3. VISUALIZACIÓN DE INTEGRACIÓN / DERIVACIÓN */}
      {calcNodes.length > 0 && (
        <>
          {calcNodes.length > 1 && (
            <Line points={calcNodes.map((n) => [n.x, n.y, 0])} color="#818cf8" lineWidth={3} />
          )}
          {calcNodes.map((n, i) => (
            <group key={i}>
              <Line points={[[n.x, 0, 0], [n.x, n.y, 0]]} color="#38bdf8" lineWidth={1.5} />
              <mesh position={[n.x, n.y, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.7} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* 4. VISUALIZACIÓN DE TRAYECTORIA EDO */}
      {odeCoords.length > 1 && (
        <>
          <Line points={odeCoords} color="#10b981" lineWidth={3} />
          {odeCoords.map((pos, idx) => (
            <mesh key={idx} position={pos}>
              <sphereGeometry args={[idx === odeCoords.length - 1 ? 0.14 : 0.06, 16, 16]} />
              <meshStandardMaterial
                color={idx === odeCoords.length - 1 ? '#38bdf8' : '#10b981'}
                emissive="#059669"
                emissiveIntensity={0.6}
              />
            </mesh>
          ))}
        </>
      )}

      {/* 5. VISUALIZACIÓN DE VECTOR SOLUCIÓN EN SISTEMAS LINEALES */}
      {category === 'linear_systems' && result?.solution && (
        <group position={[0, 0.5, 0]}>
          {result.solution.map((val, idx) => (
            <group key={idx} position={[(idx - (result.solution.length - 1) / 2) * 1.4, 0, 0]}>
              <mesh position={[0, THREE.MathUtils.clamp(val / 2, -2, 2), 0]}>
                <boxGeometry args={[0.6, Math.max(0.2, Math.min(4, Math.abs(val))), 0.6]} />
                <meshStandardMaterial color="#818cf8" emissive="#4f46e5" emissiveIntensity={0.45} />
              </mesh>
              <Text position={[0, -1.6, 0]} fontSize={0.18} color="#e2e8f0">
                {`x${idx + 1} = ${val}`}
              </Text>
            </group>
          ))}
        </group>
      )}
    </>
  )
}
