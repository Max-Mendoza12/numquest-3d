import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Line,
  Text,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import {
  XROrigin,
  useXR,
  useXRControllerLocomotion,
} from '@react-three/xr'
import { MathUtils } from 'three'

import SpatialButton from '../xr/SpatialButton.jsx'
import SpatialPanel from '../xr/SpatialPanel.jsx'
import {
  buildImmersiveNewton,
} from './immersiveGeometry.js'

function UserNavigation({ depth, resetRevision }) {
  const origin = useRef(null)

  useEffect(() => {
    if (!origin.current) return

    origin.current.position.set(0, 0, 4)
    origin.current.rotation.set(0, 0, 0)
  }, [resetRevision])

  useXRControllerLocomotion(
    origin,
    { speed: 0.9 },
    { type: 'snap', degrees: 30, deadZone: 0.7 },
    'left'
  )

  useFrame(() => {
    if (!origin.current) return

    const p = origin.current.position

    p.x = MathUtils.clamp(p.x, -6, 6)
    p.z = MathUtils.clamp(p.z, -depth - 3, 5)
    p.y = 0
  })

  return (
    <XROrigin
      ref={origin}
      position={[0, 0, 4]}
    />
  )
}

function Label({
  children,
  position,
  size = 0.13,
  color = '#cbd5e1',
  width = 5,
}) {
  return (
    <Text
      position={position}
      fontSize={size}
      color={color}
      maxWidth={width}
      textAlign="center"
      raycast={() => null}
    >
      {children}
    </Text>
  )
}

function Marker({ position, color, active, onSelect }) {
  return (
    <mesh
      position={position}
      pointerEventsType={{ deny: 'grab' }}
      onClick={event => {
        event.stopPropagation()
        onSelect()
      }}
    >
      <sphereGeometry args={[
        active ? 0.10 : 0.075, 16, 16
      ]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function CoordinateWorld({
  geometry,
  plot,
  step,
  onSeek,
}) {
  const {
    stations, depth, X, Y, xmin, xmax, ymin, ymax,
  } = geometry

  const floorSize = Math.max(18, depth + 10)

  return (
    <group>
      <gridHelper
        args={[
          floorSize,
          Math.ceil(floorSize),
          '#355b70',
          '#1c3548',
        ]}
        position={[0, 0, -depth / 2]}
      />

      <Line
        points={[
          [X(Math.min(xmin, 0)), Y(0), 0],
          [X(Math.max(xmax, 0)), Y(0), 0],
        ]}
        color="#f87171"
        lineWidth={3}
      />

      <Line
        points={[[0, Y(ymin), 0], [0, Y(ymax), 0]]}
        color="#4ade80"
        lineWidth={3}
      />

      <Line
        points={[[0, Y(0), 1], [0, Y(0), -depth - 1]]}
        color="#60a5fa"
        lineWidth={3}
      />

      <Label
        position={[X(xmax) + 0.25, Y(0), 0]}
        color="#f87171"
      >
        X
      </Label>

      <Label
        position={[0, Y(ymax) + 0.25, 0]}
        color="#4ade80"
      >
        Y
      </Label>

      <Label
        position={[0, Y(0) + 0.25, -depth - 1]}
        color="#60a5fa"
      >
        Z · Pasos
      </Label>

      {Array.from({ length: 7 }, (_, i) => {
        const value = ymin + (ymax - ymin) * i / 6

        return (
          <group key={`y-${i}`}>
            <Line
              points={[
                [-0.06, Y(value), 0],
                [0.06, Y(value), 0],
              ]}
              color="#4ade80"
              lineWidth={1}
            />

            <Label
              position={[-0.25, Y(value), 0]}
              size={0.085}
              color="#86efac"
            >
              {Number(value.toPrecision(4)).toString()}
            </Label>
          </group>
        )
      })}

      {stations.map(station => (
        <group key={`z-${station.index}`}>
          <Line
            points={[
              [-0.08, Y(0), station.z],
              [0.08, Y(0), station.z],
            ]}
            color="#60a5fa"
            lineWidth={2}
          />

          <Label
            position={[-0.28, Y(0) - 0.16, station.z]}
            size={0.10}
            color="#93c5fd"
          >
            {String(station.index + 1)}
          </Label>
        </group>
      ))}

      {stations.length > 1 && (
        <Line
          points={stations.map(s => s.next)}
          color="#a78bfa"
          dashed
          dashSize={0.15}
          gapSize={0.09}
          lineWidth={2}
        />
      )}

      {stations.map(station => {
        const active = station.index === step
        const final = station.index === stations.length - 1 && plot.converged

        return (
          <group key={station.index}>
            <Line
              points={[
                [X(xmin), Y(0), station.z],
                [X(xmax), Y(0), station.z],
              ]}
              color="#64748b"
              lineWidth={1}
            />

            {Array.from({ length: 6 }, (_, i) => {
              const value = xmin + (xmax - xmin) * i / 5

              return (
                <group key={i}>
                  <Line
                    points={[
                      [X(value), Y(0) - 0.06, station.z],
                      [X(value), Y(0) + 0.06, station.z],
                    ]}
                    color="#64748b"
                    lineWidth={1}
                  />
                  {active && (
                    <Label
                      position={[X(value), Y(0) - 0.15, station.z]}
                      size={0.075}
                    >
                      {Number(value.toPrecision(3)).toString()}
                    </Label>
                  )}
                </group>
              )
            })}

            {station.segments.map((segment, i) => (
              <Line
                key={i}
                points={segment}
                color="#22d3ee"
                transparent
                opacity={active ? 1 : 0.45}
                lineWidth={active ? 3 : 1.5}
              />
            ))}

            {station.tangent && (
              <Line
                points={station.tangent}
                color="#f59e0b"
                dashed
                dashSize={0.13}
                gapSize={0.07}
                transparent
                opacity={active ? 1 : 0.45}
                lineWidth={2}
              />
            )}

            {station.areaPolygon && (
              <Line
                points={station.areaPolygon}
                color="#34d399"
                transparent
                opacity={active ? 1 : 0.5}
                lineWidth={active ? 2.5 : 1.5}
              />
            )}

            <Line
              points={[
                station.current,
                [station.current[0], Y(0), station.z],
              ]}
              color="#a78bfa"
              dashed
              dashSize={0.1}
              gapSize={0.07}
              lineWidth={1.5}
            />

            <Marker
              position={station.current}
              color="#a78bfa"
              active={active}
              onSelect={() => onSeek(station.index)}
            />

            <Marker
              position={station.next}
              color={final ? '#34d399' : '#fbbf24'}
              active={active}
              onSelect={() => onSeek(station.index)}
            />

            <Label
              position={[0, 3.2, station.z]}
              size={active ? 0.19 : 0.13}
              color={active ? '#67e8f9' : '#94a3b8'}
            >
              {station.label}
            </Label>

            {active && (
              <Label
                position={[0, 2.99, station.z]}
                size={0.12}
                color="#fbbf24"
              >
                {`Valor = ${station.primaryValue.toFixed(8)}`}
              </Label>
            )}
          </group>
        )
      })}
    </group>
  )
}

function formatImmersiveSummary(plot) {
  if (!plot) return 'Calcula un método o carga ejemplo'
  if (plot.root !== undefined && Number.isFinite(Number(plot.root))) {
    return `${plot.converged ? 'Raíz' : 'Aprox'}: ${Number(plot.root).toFixed(8)}`
  }
  if (plot.y_eval !== undefined && Number.isFinite(Number(plot.y_eval))) {
    return `P(${plot.x_eval}) = ${Number(plot.y_eval).toFixed(8)}`
  }
  if (plot.integral !== undefined && Number.isFinite(Number(plot.integral))) {
    return `Integral ≈ ${Number(plot.integral).toFixed(8)}`
  }
  const last = plot.steps?.at(-1)
  const val = last?.value ?? last?.next_x
  return Number.isFinite(val) ? `Resultado: ${Number(val).toFixed(8)}` : 'Cálculo activo'
}

export default function ImmersiveLab({
  plot,
  methodLabel,
  step,
  playing,
  onSeek,
  onToggle,
  onLoadExample,
  loading,
  errorMsg,
  immersive = false,
}) {
  const session = useXR(state => state.session)
  const [resetRevision, setResetRevision] = useState(0)

  const geometry = useMemo(
    () => buildImmersiveNewton(plot),
    [plot]
  )

  const depth = geometry?.depth ?? 4
  const total = geometry?.stations.length ?? 0
  const current = geometry?.stations[step]

  function recenter() {
    setResetRevision(value => value + 1)
  }

  return (
    <>
      <color attach="background" args={['#081321']} />

      {immersive ? (
        <UserNavigation
          depth={depth}
          resetRevision={resetRevision}
        />
      ) : (
        <>
          <PerspectiveCamera
            makeDefault
            position={[10, 7, 10]}
            fov={52}
          />

          <OrbitControls
            makeDefault
            target={[0, 1.5, -depth / 2]}
            enableDamping
            dampingFactor={0.1}
            rotateSpeed={0.25}
            zoomSpeed={0.4}
            panSpeed={0.3}
            minDistance={0.7}
            maxDistance={40}
          />
        </>
      )}

      {geometry && (
        <CoordinateWorld
          geometry={geometry}
          plot={plot}
          step={step}
          onSeek={onSeek}
        />
      )}

      <SpatialPanel
        position={[-2.5, 1.5, 1.1]}
        width={1.35}
        height={1.45}
        title="NumQuest Immersive"
      >
        {plot ? (
          <Label
            position={[0, 0.35, 0.04]}
            size={0.044}
            color="#38bdf8"
            width={1.2}
          >
            {`Método: ${methodLabel ?? plot.kind}`}
          </Label>
        ) : (
          <SpatialButton
            position={[0, 0.35, 0.035]}
            label={loading ? 'Calculando...' : 'Cargar ejemplo'}
            width={1.1}
            height={0.12}
            disabled={loading}
            onClick={() => onLoadExample({
              method: 'newton',
              expression: 'x^3-2*x-5',
              x0: 2,
            })}
          />
        )}

        <Label
          position={[0, 0.16, 0.04]}
          size={0.041}
          width={1.2}
        >
          {formatImmersiveSummary(plot)}
        </Label>

        <Label
          position={[0, 0.05, 0.04]}
          size={0.038}
          color="#a78bfa"
          width={1.2}
        >
          {current
            ? `${current.label} (${step + 1} de ${total})`
            : 'Sin cálculo activo'}
        </Label>

        <SpatialButton
          position={[-0.36, -0.10, 0.035]}
          label="Anterior"
          width={0.33}
          disabled={!current || step === 0}
          onClick={() => onSeek(step - 1)}
        />

        <SpatialButton
          position={[0, -0.10, 0.035]}
          label={playing ? 'Pausar' : 'Reproducir'}
          width={0.33}
          disabled={total <= 1}
          onClick={onToggle}
        />

        <SpatialButton
          position={[0.36, -0.10, 0.035]}
          label="Siguiente"
          width={0.33}
          disabled={!current || step >= total - 1}
          onClick={() => onSeek(step + 1)}
        />

        <Label
          position={[0, -0.25, 0.04]}
          size={0.032}
          width={1.18}
          color="#94a3b8"
        >
          {immersive
            ? 'Joystick izquierdo: mover. Derecho: girar.'
            : 'Arrastra para explorar el espacio XYZ.'}
        </Label>

        {errorMsg && (
          <Label
            position={[0, -0.36, 0.04]}
            size={0.028}
            color="#fb7185"
            width={1.2}
          >
            {String(errorMsg).slice(0, 100)}
          </Label>
        )}

        {immersive && (
          <>
            <SpatialButton
              position={[0, -0.47, 0.035]}
              label="Volver al inicio"
              width={1.1}
              onClick={recenter}
            />

            <SpatialButton
              position={[0, -0.60, 0.035]}
              label="Salir de VR"
              width={1.1}
              onClick={() => session?.end()}
            />
          </>
        )}
      </SpatialPanel>
    </>
  )
}