import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { DoubleSide } from 'three'

function AreaMesh({ positions, color, opacity }) {
  if (!positions.length) return null

  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <meshBasicMaterial
        color={color}
        opacity={opacity}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

export default function IntegrationGeometry({
  plot,
  index,
  X,
  Y,
}) {
  const areas = useMemo(() => {
    const buckets = [[], [], [], []]

    function addSegment(x1, y1, x2, y2, active) {
      // Separar cruces con el eje X para evitar
      // triangulos que se superponen.
      if (
        (y1 < 0 && y2 > 0) ||
        (y1 > 0 && y2 < 0)
      ) {
        const t = -y1 / (y2 - y1)
        const crossing = x1 + (x2 - x1) * t

        addSegment(x1, y1, crossing, 0, active)
        addSegment(crossing, 0, x2, y2, active)
        return
      }

      const negative = (
        ((y1 + y2) / 2) * plot.direction
      ) < 0

      const bucket = (active ? 2 : 0) + (negative ? 1 : 0)

      const a = [X(x1), Y(0), -0.012]
      const b = [X(x1), Y(y1), -0.012]
      const c = [X(x2), Y(y2), -0.012]
      const d = [X(x2), Y(0), -0.012]

      buckets[bucket].push(
        ...a, ...b, ...c,
        ...a, ...c, ...d
      )
    }

    for (let i = 0; i <= index; i++) {
      const points = plot.steps[i].points

      for (let j = 1; j < points.length; j++) {
        const [x1, y1] = points[j - 1]
        const [x2, y2] = points[j]

        addSegment(x1, y1, x2, y2, i === index)
      }
    }

    return buckets.map(
      values => new Float32Array(values)
    )
  }, [plot, index, X, Y])

  const current = plot.steps[index]

  return (
    <group>
      <AreaMesh
        positions={areas[0]}
        color="#a78bfa"
        opacity={0.22}
      />

      <AreaMesh
        positions={areas[1]}
        color="#fb7185"
        opacity={0.22}
      />

      <AreaMesh
        positions={areas[2]}
        color="#f59e0b"
        opacity={0.42}
      />

      <AreaMesh
        positions={areas[3]}
        color="#fb7185"
        opacity={0.48}
      />

      {plot.steps.slice(0, index + 1).map((block, i) => (
        <Line
          key={i}
          points={block.points.map(
            ([x, y]) => [X(x), Y(y), 0.028]
          )}
          color={block.contribution < 0
            ? '#fb7185'
            : i === index ? '#fbbf24' : '#a78bfa'}
          lineWidth={i === index ? 3 : 1.2}
        />
      ))}

      {[current.a, current.b].map((x, i) => (
        <Line
          key={i}
          points={[
            [X(x), -1.65, 0.025],
            [X(x), 1.65, 0.025],
          ]}
          color="#fbbf24"
          dashed
          dashSize={0.08}
          gapSize={0.05}
          lineWidth={1.3}
        />
      ))}

      {plot.nodes.map(([x, y], i) => {
        const active = current.node_indices.includes(i)

        return (
          <mesh key={i} position={[X(x), Y(y), 0.04]}>
            <sphereGeometry args={[
              active ? 0.075 : 0.04, 12, 12
            ]} />

            <meshBasicMaterial
              color={active ? '#fbbf24' : '#a78bfa'}
            />
          </mesh>
        )
      })}
    </group>
  )
}
