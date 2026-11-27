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
} from '@react-three/xr'
import { MathUtils, Vector3 } from 'three'
import { readThumbstick, snapTurn } from './locomotion.js'

import { LinearWorld } from './LinearWorld.jsx'
import ODEGeometry from '../scenes/ODEGeometry.jsx'
import ImmersiveControls from './ImmersiveControls.jsx'
import SupplementalWorld from '../scenes/SupplementalWorld.jsx'
import {
  buildImmersiveNewton,
  formatImmersiveSummary,
} from './immersiveGeometry.js'

function UserNavigation({ resetRevision }) {
  const origin = useRef(null)
  const turnLatch = useRef(false)

  const vectors = useRef({
    forward: new Vector3(),
    right: new Vector3(),
    pivot: new Vector3(),
    offset: new Vector3(),
    up: new Vector3(0, 1, 0),
  })

  useEffect(() => {
    if (!origin.current) return

    origin.current.position.set(0, 0, 4)
    origin.current.rotation.set(0, 0, 0)
    turnLatch.current = false
  }, [resetRevision])

  useFrame(({ gl }, delta) => {
    const rig = origin.current
    const session = gl.xr.getSession()

    if (!rig || !session) return

    const view = gl.xr.getCamera()
    const sources = session.inputSources

    const [moveX, moveY] = readThumbstick(
      sources, 'left'
    )

    const [turnX] = readThumbstick(
      sources, 'right'
    )

    const { forward, right, pivot, offset, up } = vectors.current

    forward.set(0, 0, -1)
      .transformDirection(view.matrixWorld)

    forward.setY(0)

    if (forward.lengthSq() > 1e-8) {
      forward.normalize()

      right.crossVectors(forward, up).normalize()

      const distance = 0.9 * Math.min(delta, 0.05)

      rig.position.addScaledVector(
        forward, -moveY * distance
      )

      rig.position.addScaledVector(
        right, moveX * distance
      )
    }

    const turn = snapTurn(turnX, turnLatch.current)
    turnLatch.current = turn.latched

    if (turn.angle !== 0) {
      pivot.setFromMatrixPosition(view.matrixWorld)
      pivot.setY(0)

      offset.copy(rig.position)
        .sub(pivot)
        .applyAxisAngle(up, turn.angle)

      rig.position.copy(pivot).add(offset)
      rig.rotation.y += turn.angle
    }

    rig.position.x = MathUtils.clamp(
      rig.position.x, -8, 8
    )

    rig.position.z = MathUtils.clamp(
      rig.position.z, -8, 8
    )

    rig.position.y = 0
  })

  return <XROrigin ref={origin} />
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
        points={[[0, Y(0), 3], [0, Y(0), -3]]}
        color="#60a5fa"
        lineWidth={3}
      />

      <Label
        position={[X(xmax) + 0.25, Y(0), 0]}
        color="#f87171"
      >
        {plot.kind === 'ode' ? 't' : 'X'}
      </Label>

      <Label
        position={[0, Y(ymax) + 0.25, 0]}
        color="#4ade80"
      >
        Y
      </Label>

      <Label
        position={[0, Y(0) + 0.25, -3]}
        color="#60a5fa"
      >
        Z · Profundidad
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

      {stations.map(station => {
        const active = station.index === step
        const final = station.isRoot &&
          station.index === plot.steps.length - 1 &&
          plot.converged

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

            {station.odeFrame && (
              <ODEGeometry
                frame={station.odeFrame}
                active={active}
                spatial
                onSelect={() => onSeek(station.index)}
              />
            )}

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
                color={station.data.contribution < 0
                  ? '#fb7185' : '#fbbf24'}
                transparent
                opacity={active ? 1 : 0.5}
                lineWidth={active ? 2.5 : 1.5}
              />
            )}

            {station.guides.map((points, i) => (
              <Line
                key={`guide-${i}`}
                points={points}
                color="#a78bfa"
                dashed
                dashSize={0.10}
                gapSize={0.06}
                lineWidth={1.5}
              />
            ))}

            {station.extraPoints.map((position, i) => (
              <Marker
                key={`extra-${i}`}
                position={position}
                color="#a78bfa"
                active={active}
                onSelect={() => onSeek(station.index)}
              />
            ))}

            {(station.isRoot || station.isInterpolation) && (
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
            )}

            {!station.odeFrame && (
              <Marker
                position={station.current}
                color={station.isInterpolation
                  ? '#34d399' : '#a78bfa'}
                active={active}
                onSelect={() => onSeek(station.index)}
              />
            )}

            {!station.odeFrame && station.next && (
              <Marker
                position={station.next}
                color={final ? '#34d399' : '#fbbf24'}
                active={active}
                onSelect={() => onSeek(station.index)}
              />
            )}

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
                {`${station.odeFrame ? 'y siguiente' : 'Valor'} = ${station.primaryValue.toFixed(8)}`}
              </Label>
            )}
          </group>
        )
      })}
    </group>
  )
}

export default function ImmersiveLab({
  plot,
  methodLabel,
  formState,
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
    () => buildImmersiveNewton(plot, 0, step),
    [plot, step]
  )

  const linear = plot?.kind === 'linear_system'
  const supplemental = plot?.kind === 'supplemental'

  const total = linear || supplemental
    ? plot.steps.length
    : geometry?.totalSteps ?? 0

  const current = linear || supplemental
    ? plot.steps[step]
    : geometry?.stations[0]

  function recenter() {
    setResetRevision(value => value + 1)
  }

  return (
    <>
      <color attach="background" args={['#081321']} />

      {immersive ? (
        <UserNavigation
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
            target={linear
              ? [0, 2.8, 0]
              : [0, 1.5, 0]}
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

      {linear && (
        <LinearWorld plot={plot} step={step} />
      )}

      {supplemental && (
        <SupplementalWorld plot={plot} step={step} />
      )}

      {geometry && (
        <CoordinateWorld
          geometry={geometry}
          plot={plot}
          step={step}
          onSeek={onSeek}
        />
      )}

      <ImmersiveControls
        formState={formState}
        methodLabel={methodLabel}
        summary={linear
          ? `Solución: (${plot.solution.map(
              value => Number(value.toPrecision(5))
            ).join(', ')})`
          : supplemental
            ? current?.valueLabel ?? plot.title
            : formatImmersiveSummary(plot)}
        stepLabel={current
          ? `${current.label} · ${step + 1}/${total}${
              geometry?.pageCount > 1
                ? ` · Grupo ${geometry.pageIndex + 1}/${geometry.pageCount}`
                : ''
            }`
          : ''}
        step={step}
        total={total}
        playing={playing}
        loading={loading}
        errorMsg={errorMsg}
        onSeek={onSeek}
        onToggle={onToggle}
        onCalculate={onLoadExample}
        onRecenter={recenter}
        onExit={() => session?.end()}
        immersive={immersive}
      />
    </>
  )
}
