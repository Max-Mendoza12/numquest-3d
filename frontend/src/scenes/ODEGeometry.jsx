import { Line, Text, Billboard } from '@react-three/drei'

function Marker({ position, color, radius, onSelect }) {
  return (
    <mesh
      position={position}
      pointerEventsType={{ deny: 'grab' }}
      onClick={event => {
        if (!onSelect) return
        event.stopPropagation()
        onSelect()
      }}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export default function ODEGeometry({
  frame,
  active = true,
  spatial = false,
  onSelect,
}) {
  if (!frame) return null

  return (
    <group>
      {frame.history.length > 1 && (
        <Line
          points={frame.history}
          color="#22d3ee"
          lineWidth={2.5}
          raycast={() => null}
        />
      )}

      <Line
        points={frame.path}
        color="#34d399"
        transparent
        opacity={active ? 1 : 0.5}
        lineWidth={active ? 3.5 : 2}
        raycast={() => null}
      />

      {active && frame.stages.map((stage, i) => (
        <group key={i}>
          <Line
            points={stage.guide}
            color="#fbbf24"
            dashed
            dashSize={0.06}
            gapSize={0.04}
            lineWidth={2}
            raycast={() => null}
          />

          <Marker
            position={stage.point}
            color="#fbbf24"
            radius={0.055}
            onSelect={onSelect}
          />

          <Billboard position={[
            stage.point[0],
            stage.point[1] + 0.13 + i * 0.10,
            stage.point[2] + 0.04,
          ]}>
            <Text
              fontSize={spatial ? 0.11 : 0.10}
              color="#fbbf24"
              raycast={() => null}
            >
              {stage.label}
            </Text>
          </Billboard>
        </group>
      ))}

      <Marker
        position={frame.start}
        color="#a78bfa"
        radius={0.07}
        onSelect={onSelect}
      />

      <Marker
        position={frame.end}
        color="#34d399"
        radius={active ? 0.10 : 0.065}
        onSelect={onSelect}
      />
    </group>
  )
}
