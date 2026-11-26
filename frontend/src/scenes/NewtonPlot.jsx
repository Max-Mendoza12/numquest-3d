import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Line, Text, OrbitControls, OrthographicCamera } from '@react-three/drei'

const COLORS = {
  curve: '#22d3ee',
  tangent: '#f59e0b',
  iteration: '#a78bfa',
  root: '#34d399',
  grid: '#334155',
  axis: '#94a3b8',
  text: '#cbd5e1',
}

function Point({ position, color, radius = 0.065 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 20, 20]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export function NewtonPlot({ plot, step = 0, width = 5.4 }) {
  const geometry = useMemo(() => {
    const [xmin, xmax] = plot.domain
    const [ymin, ymax] = plot.range

    const X = x => -width / 2 + width * ((x - xmin) / (xmax - xmin))
    const Y = y => -1.65 + 3.3 * ((y - ymin) / (ymax - ymin))

    const segments = []
    let current = []

    for (const [x, y] of plot.samples) {
      if (!Number.isFinite(y)) {
        if (current.length > 1) segments.push(current)
        current = []
        continue
      }

      const point = [X(x), Y(y), 0]

      // Evitar unir saltos verticales grandes.
      if (
        current.length &&
        Math.abs(point[1] - current.at(-1)[1]) > 1.2
      ) {
        if (current.length > 1) segments.push(current)
        current = []
      }

      current.push(point)
    }

    if (current.length > 1) segments.push(current)

    const xTicks = Array.from(
      { length: 7 },
      (_, i) => xmin + (xmax - xmin) * i / 6
    )

    const yTicks = Array.from(
      { length: 7 },
      (_, i) => ymin + (ymax - ymin) * i / 6
    )

    return { X, Y, segments, xTicks, yTicks, xmin, xmax, ymin, ymax }
  }, [plot, width])

  const { X, Y, segments, xTicks, yTicks } = geometry

  const index = Math.min(
    Math.max(step, 0),
    plot.steps.length - 1
  )

  const active = plot.steps[index]
  const isBisection = plot.kind === 'bisection'
  const isSecant = plot.kind === 'secant'

  const format = n => Number(n.toPrecision(4)).toString()

  const point = [X(active.x), Y(active.fx), 0.04]
  const next = [X(active.next_x), Y(0), 0.04]

  const finalStep = index === plot.steps.length - 1

  const { xmin, xmax, ymin, ymax } = geometry

  let tangent = null

  if (!isBisection && Number.isFinite(active.slope) && active.slope !== 0) {
    const tx1 = active.x + (ymin - active.fx) / active.slope
    const tx2 = active.x + (ymax - active.fx) / active.slope

    const left = Math.max(xmin, Math.min(tx1, tx2))
    const right = Math.min(xmax, Math.max(tx1, tx2))

    const lineY = x => active.fx + active.slope * (x - active.x)

    if (left <= right) {
      tangent = [
        [X(left), Y(lineY(left)), 0.035],
        [X(right), Y(lineY(right)), 0.035],
      ]
    }
  }

  return (
    <group>
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[width + 0.25, 3.55]} />
        <meshBasicMaterial
          color="#102039"
          transparent
          opacity={0.72}
        />
      </mesh>

      {xTicks.map((x, i) => (
        <group key={`x-${i}`}>
          <Line
            points={[[X(x), -1.65, 0], [X(x), 1.65, 0]]}
            color={COLORS.grid}
            lineWidth={0.8}
          />

          <Text
            position={[X(x), -1.84, 0]}
            fontSize={0.12}
            color={COLORS.text}
          >
            {format(x)}
          </Text>
        </group>
      ))}

      {yTicks.map((y, i) => (
        <group key={`y-${i}`}>
          <Line
            points={[[-width / 2, Y(y), 0], [width / 2, Y(y), 0]]}
            color={COLORS.grid}
            lineWidth={0.8}
          />

          <Text
            position={[-width / 2 - 0.14, Y(y), 0]}
            fontSize={0.12}
            color={COLORS.text}
            anchorX="right"
          >
            {format(y)}
          </Text>
        </group>
      ))}

      <Line
        points={[[-width / 2, Y(0), 0.01], [width / 2, Y(0), 0.01]]}
        color={COLORS.axis}
        lineWidth={2}
      />

      {geometry.xmin <= 0 && geometry.xmax >= 0 && (
        <Line
          points={[[X(0), -1.65, 0.01], [X(0), 1.65, 0.01]]}
          color={COLORS.axis}
          lineWidth={2}
        />
      )}

      {segments.map((segment, i) => (
        <Line
          key={i}
          points={segment}
          color={COLORS.curve}
          lineWidth={3}
        />
      ))}

      {isBisection && (
        <group>
          <mesh position={[
            (X(active.a) + X(active.b)) / 2,
            0,
            -0.015
          ]}>
            <planeGeometry args={[
              Math.abs(X(active.b) - X(active.a)),
              3.3
            ]} />
            <meshBasicMaterial
              color="#a78bfa"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>

          {[active.a, active.b].map((x, i) => (
            <Line
              key={i}
              points={[[X(x), -1.65, 0.02], [X(x), 1.65, 0.02]]}
              color={COLORS.iteration}
              dashed
              dashSize={0.08}
              gapSize={0.05}
              lineWidth={2}
            />
          ))}

          <Point
            position={[X(active.a), Y(active.fa), 0.04]}
            color={COLORS.iteration}
          />
          <Point
            position={[X(active.b), Y(active.fb), 0.04]}
            color={COLORS.iteration}
          />
        </group>
      )}

      {tangent && (
        <Line
          points={tangent}
          color={COLORS.tangent}
          dashed
          dashSize={0.10}
          gapSize={0.06}
          lineWidth={2.5}
        />
      )}

      {isSecant && (
        <Point
          position={[
            X(active.previous_x),
            Y(active.previous_fx),
            0.04
          ]}
          color={COLORS.iteration}
        />
      )}

      <Line
        points={[
          [X(active.x), Y(0), 0.025],
          point
        ]}
        color={COLORS.iteration}
        dashed
        dashSize={0.07}
        gapSize={0.04}
        lineWidth={1.5}
      />

      <Point
        position={point}
        color={COLORS.iteration}
      />

      <Point
        position={next}
        color={finalStep && plot.converged
          ? COLORS.root
          : COLORS.tangent}
        radius={0.08}
      />

      <Text
        position={[0, 2.08, 0]}
        fontSize={0.19}
        color={COLORS.curve}
        maxWidth={width}
      >
        {`f(x) = ${plot.expression}`}
      </Text>

      <Text
        position={[0, -2.16, 0]}
        fontSize={0.15}
        color={COLORS.iteration}
      >
        {`Iteración ${index + 1}: x = ${active.next_x.toFixed(8)}`}
      </Text>

      <Text
        position={[width / 2 + 0.23, Y(0), 0]}
        fontSize={0.14}
        color={COLORS.text}
      >
        x
      </Text>
    </group>
  )
}

export default function NewtonScene({ plot, step }) {
  const size = useThree(state => state.size)

  const zoom = Math.max(
    1,
    Math.min(size.height / 4.65, size.width / 4.2)
  )

  const width = Math.max(
    2,
    Math.min(14, size.width / zoom - 1.05)
  )

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 8]}
        zoom={zoom}
        near={0.1}
        far={100}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enableRotate={false}
        enablePan={false}
        zoomSpeed={0.30}
        minZoom={zoom * 0.75}
        maxZoom={zoom * 3}
      />

      <NewtonPlot
        plot={plot}
        step={step}
        width={width}
      />
    </>
  )
}
