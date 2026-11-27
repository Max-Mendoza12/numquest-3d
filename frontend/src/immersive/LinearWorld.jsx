import { useMemo, useState } from 'react'
import {
  Billboard,
  Line,
  Text,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import { DoubleSide } from 'three'
import { useXR } from '@react-three/xr'

import SpatialPanel from '../xr/SpatialPanel.jsx'
import SpatialButton from '../xr/SpatialButton.jsx'

import {
  buildLinearGeometry,
  WORLD_RADIUS,
  WORLD_HEIGHT,
} from './linearGeometry.js'

const PLANE_COLORS = ['#22d3ee', '#a78bfa', '#fbbf24']
const AXIS_COLORS = ['#f87171', '#4ade80', '#60a5fa']
const AXIS_NAMES = ['X', 'Y', 'Z']

function number(value) {
  return Number(value.toPrecision(5)).toString()
}

function equation(row) {
  return row.slice(0, 3).map((value, i) =>
    `${i === 0 ? '' : value < 0 ? ' - ' : ' + '}${
      number(i === 0 ? value : Math.abs(value))
    }${AXIS_NAMES[i].toLowerCase()}`
  ).join('') + ` = ${number(row[3])}`
}

function Label({ position, children, color = '#e2e8f0',
  size = 0.12, width = 5 }) {
  return (
    <Billboard position={position}>
      <Text
        fontSize={size}
        color={color}
        maxWidth={width}
        textAlign="center"
        raycast={() => null}
      >
        {children}
      </Text>
    </Billboard>
  )
}

function EquationPlane({ plane, selected, onSelect }) {
  const positions = useMemo(
    () => new Float32Array(plane.triangles),
    [plane]
  )

  const color = PLANE_COLORS[plane.index]

  return (
    <group>
      <mesh
        onClick={event => {
          event.stopPropagation()
          onSelect(plane.index)
        }}
        pointerEventsType={{ deny: 'grab' }}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>

        <meshBasicMaterial
          color={color}
          side={DoubleSide}
          transparent
          opacity={selected ? 0.30 : 0.13}
          depthWrite={false}
        />
      </mesh>

      <Line
        points={[...plane.vertices, plane.vertices[0]]}
        color={color}
        lineWidth={selected ? 2.5 : 1.5}
        raycast={() => null}
      />
    </group>
  )
}

export function LinearWorld({ plot, step }) {
  const geometry = useMemo(
    () => buildLinearGeometry(plot, step),
    [plot, step]
  )

  const [selected, setSelected] = useState(0)

  if (!geometry) {
    return (
      <Label position={[0, 1.8, 0]} color="#fbbf24">
        Geometría no disponible para este sistema
      </Label>
    )
  }

  const { extent, toWorld, planes } = geometry

  return (
    <group>
      <gridHelper
        args={[12, 12, '#355b70', '#1c3548']}
      />

      {AXIS_NAMES.map((name, axis) => {
        const start = [0, 0, 0]
        const end = [0, 0, 0]

        start[axis] = -extent
        end[axis] = extent

        const label = toWorld(end)
        label[axis] += 0.26

        return (
          <group key={name}>
            <Line
              points={[toWorld(start), toWorld(end)]}
              color={AXIS_COLORS[axis]}
              lineWidth={2.5}
              raycast={() => null}
            />

            <Label
              position={label}
              color={AXIS_COLORS[axis]}
              size={0.18}
            >
              {name}
            </Label>

            {[-1, -0.5, 0.5, 1].map(fraction => {
              const value = extent * fraction
              const coords = [0, 0, 0]
              coords[axis] = value

              const a = toWorld(coords)
              const b = [...a]
              const offsetAxis = (axis + 1) % 3

              a[offsetAxis] -= 0.065
              b[offsetAxis] += 0.065

              const tick = toWorld(coords)
              tick[offsetAxis] += 0.19

              return (
                <group key={fraction}>
                  <Line
                    points={[a, b]}
                    color={AXIS_COLORS[axis]}
                    lineWidth={1.4}
                    raycast={() => null}
                  />

                  <Label
                    position={tick}
                    size={0.075}
                    color={AXIS_COLORS[axis]}
                  >
                    {number(value)}
                  </Label>
                </group>
              )
            })}
          </group>
        )
      })}

      {planes.map(plane => (
        <EquationPlane
          key={plane.index}
          plane={plane}
          selected={selected === plane.index}
          onSelect={setSelected}
        />
      ))}

      {geometry.intersections.map(line => (
        <Line
          key={line.rows.join('-')}
          points={line.points}
          color="#cbd5e1"
          dashed
          dashSize={0.12}
          gapSize={0.08}
          lineWidth={1.5}
          raycast={() => null}
        />
      ))}

      <mesh
        position={geometry.solutionPosition}
        raycast={() => null}
      >
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>

      <Label
        position={geometry.solutionPosition.map(
          (value, i) => i === 1 ? value + 0.25 : value
        )}
        size={0.15}
        color="#6ee7b7"
      >
        {`Solución (${geometry.solution.map(number).join(', ')})`}
      </Label>

      <Label
        position={[0, WORLD_HEIGHT + WORLD_RADIUS + 0.55, 0]}
        color="#67e8f9"
        size={0.20}
        width={7}
      >
        {geometry.label}
      </Label>

      <Label
        position={[0, WORLD_HEIGHT + WORLD_RADIUS + 0.30, 0]}
        color={PLANE_COLORS[selected]}
        size={0.15}
        width={7}
      >
        {`Ecuación ${selected + 1}: ${equation(planes[selected].row)}`}
      </Label>
    </group>
  )
}

export function LinearScene({ plot, step }) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[9, 7, 10]}
        fov={48}
      />

      <OrbitControls
        makeDefault
        target={[0, WORLD_HEIGHT, 0]}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.25}
        zoomSpeed={0.35}
        panSpeed={0.3}
        minDistance={0.7}
        maxDistance={30}
      />

      <LinearWorld plot={plot} step={step} />
    </>
  )
}

export function LinearAR({
  plot, step, onSeek, playing, onToggle,
}) {
  const session = useXR(state => state.session)

  return (
    <group position={[0, 0.62, -2.4]}>
      <group scale={0.23}>
        <LinearWorld plot={plot} step={step} />
      </group>

      <SpatialPanel
        position={[0, -0.12, 0.8]}
        width={1.60}
        height={0.20}
      >
        <SpatialButton
          position={[-0.60, 0, 0.035]}
          width={0.36}
          label="Anterior"
          disabled={step === 0}
          onClick={() => onSeek(step - 1)}
        />

        <SpatialButton
          position={[-0.20, 0, 0.035]}
          width={0.36}
          label={playing ? 'Pausar' : 'Reproducir'}
          onClick={onToggle}
        />

        <SpatialButton
          position={[0.20, 0, 0.035]}
          width={0.36}
          label="Siguiente"
          disabled={step === plot.steps.length - 1}
          onClick={() => onSeek(step + 1)}
        />

        <SpatialButton
          position={[0.60, 0, 0.035]}
          width={0.36}
          label="Salir AR"
          onClick={() => session?.end()}
        />
      </SpatialPanel>
    </group>
  )
}
