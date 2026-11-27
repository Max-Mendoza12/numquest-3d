import { useMemo } from 'react'
import {
  Line, Text, OrbitControls, PerspectiveCamera,
} from '@react-three/drei'

import { supplementalScale } from './supplementalPlot.js'

function Label({
  children,
  position,
  size = 0.13,
  color = '#cbd5e1',
  width = 6.5,
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

function BitWorld({ frame }) {
  const groups = [
    ['Signo', frame.bits.sign, '#a78bfa'],
    ['Exponente', frame.bits.exponent, '#0891b2'],
    ['Mantisa', frame.bits.mantissa, '#059669'],
  ]

  const bits = groups.flatMap(([name, value, color]) =>
    Array.from(value ?? '').map(bit => ({
      name, bit, color,
    }))
  )

  return (
    <group>
      <Label position={[0, 3.45, 0]} size={0.23}>
        {frame.label}
      </Label>

      {bits.map((item, index) => {
        const col = index % 16
        const row = Math.floor(index / 16)
        const x = (col - 7.5) * 0.42
        const y = 2.85 - row * 0.45

        return (
          <group key={index} position={[x, y, 0]}>
            <mesh>
              <boxGeometry args={[0.37, 0.37, 0.12]} />
              <meshBasicMaterial color={item.color} />
            </mesh>
            <Label position={[0, 0, 0.08]} size={0.21} color="#ffffff">
              {item.bit}
            </Label>
          </group>
        )
      })}

      {groups.map(([name, value, color], index) => (
        <Label
          key={name}
          position={[0, 0.85 - index * 0.18, 0]}
          size={0.13}
          color={color}
        >
          {`${name}: ${value?.length ?? 0} bits`}
        </Label>
      ))}
    </group>
  )
}

export default function SupplementalWorld({ plot, step }) {
  const scale = useMemo(
    () => supplementalScale(plot),
    [plot]
  )

  const current = plot.steps[
    Math.max(0, Math.min(plot.steps.length - 1, step))
  ]

  if (!current) return null

  if (plot.display === 'bits') {
    return <BitWorld frame={current} />
  }

  const { X, Y, xExtent, yExtent, width } = scale
  const ticks = [-1, -0.5, 0, 0.5, 1]

  const position = ([x, y]) => [X(x), Y(y), 0]

  const format = number => String(
    Number(number.toPrecision(4))
  )

  return (
    <group>
      <Label position={[0, 3.55, 0]} size={0.2}>
        {plot.title}
      </Label>

      <Label position={[0, 3.25, 0]} size={0.15}>
        {current.label}
      </Label>

      {/* Cuadrícula del plano de datos */}
      {ticks.map(tick => (
        <group key={tick}>
          <Line
            points={[
              [X(tick * xExtent), Y(-yExtent), 0],
              [X(tick * xExtent), Y(yExtent), 0],
            ]}
            color="#253d52"
            lineWidth={0.7}
          />

          <Line
            points={[
              [-width, Y(tick * yExtent), 0],
              [width, Y(tick * yExtent), 0],
            ]}
            color="#253d52"
            lineWidth={0.7}
          />

          <Label
            position={[X(tick * xExtent), 0.17, 0]}
            size={0.105}
          >
            {format(tick * xExtent)}
          </Label>

          <Label
            position={[-width - 0.34, Y(tick * yExtent), 0]}
            size={0.105}
          >
            {format(tick * yExtent)}
          </Label>
        </group>
      ))}

      <Line
        points={[[-width, Y(0), 0], [width, Y(0), 0]]}
        color="#f87171"
        lineWidth={1.8}
      />

      <Line
        points={[[0, Y(-yExtent), 0], [0, Y(yExtent), 0]]}
        color="#4ade80"
        lineWidth={1.8}
      />

      <Line
        points={[[0, Y(0), -2.5], [0, Y(0), 2.5]]}
        color="#60a5fa"
        lineWidth={1.5}
      />

      <Label position={[width + 0.45, Y(0), 0]} color="#f87171">
        {plot.axes[0]}
      </Label>

      <Label position={[0, 3.08, 0]} color="#4ade80">
        {plot.axes[1]}
      </Label>

      <Label position={[0, Y(0) + 0.2, -2.5]} color="#60a5fa">
        Z · profundidad
      </Label>

      {/* Solo una curva base cuando existe */}
      {plot.curve.length > 1 && (
        <Line
          points={plot.curve.map(position)}
          color="#22d3ee"
          lineWidth={2.5}
        />
      )}

      {/* Solo se dibuja el contenido del paso activo */}
      {current.segments.map((segment, index) => (
        <Line
          key={index}
          points={segment.map(position)}
          color="#fbbf24"
          lineWidth={3}
        />
      ))}

      {current.points.map((p, index) => (
        <group key={index}>
          <mesh position={[X(p.x), Y(p.y), 0.025]}>
            <sphereGeometry args={[0.075, 20, 16]} />
            <meshBasicMaterial color={p.color} />
          </mesh>

          {current.points.length <= 2 && (
            <Label
              position={[X(p.x), Y(p.y) + 0.15 + index * 0.15, 0.08]}
              size={0.12}
              color={p.color}
            >
              {`(${format(p.x)}, ${format(p.y)})`}
            </Label>
          )}
        </group>
      ))}

      <Label position={[0, -0.13, 0]} color="#6ee7b7" size={0.16}>
        {current.valueLabel}
      </Label>

      {plot.status && (
        <Label position={[0, -0.36, 0]} color="#fca5a5">
          {plot.status}
        </Label>
      )}
    </group>
  )
}

export function SupplementalScene({ plot, step }) {
  return (
    <>
      <color attach="background" args={['#081321']} />

      <PerspectiveCamera
        makeDefault
        position={[0, 1.7, 9]}
        fov={48}
      />

      <OrbitControls
        makeDefault
        target={[0, 1.7, 0]}
        enableDamping
        minDistance={1}
        maxDistance={30}
      />

      <SupplementalWorld plot={plot} step={step} />
    </>
  )
}
