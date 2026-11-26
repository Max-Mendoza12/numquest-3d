import { useState } from 'react'
import { Text } from '@react-three/drei'
import { useXR } from '@react-three/xr'

export default function SpatialProbe() {
  const [count, setCount] = useState(0)
  const [hovered, setHovered] = useState(false)
  const session = useXR((state) => state.session)

  return (
    <group position={[0, 1.4, -1.5]}>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[1.12, 0.72]} />
        <meshBasicMaterial
          color="#16243b"
          transparent
          opacity={0.88}
        />
      </mesh>

      <Text position={[0, 0.25, 0.02]} fontSize={0.065} color="#22d3ee">
        NumQuest Spatial Lab
      </Text>

      <Text position={[0, 0.12, 0.02]} fontSize={0.038} color="#f1f5f9">
        Apunta y haz una pinza
      </Text>

      <mesh
        position={[0, -0.035, 0.035]}
        pointerEventsType={{ deny: 'grab' }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={() => setCount((value) => value + 1)}
      >
        <boxGeometry args={[0.75, 0.14, 0.03]} />
        <meshBasicMaterial color={hovered ? '#0891b2' : '#155e75'} />
      </mesh>

      <Text
        position={[0, -0.035, 0.06]}
        fontSize={0.045}
        color="#ffffff"
        raycast={() => null}
      >
        Seleccionar
      </Text>

      <Text position={[0, -0.17, 0.02]} fontSize={0.05} color="#34d399">
        {`Selecciones: ${count}`}
      </Text>

      <mesh
        position={[0, -0.28, 0.035]}
        pointerEventsType={{ deny: 'grab' }}
        onClick={() => session?.end()}
      >
        <boxGeometry args={[0.36, 0.10, 0.03]} />
        <meshBasicMaterial color="#334155" />
      </mesh>

      <Text
        position={[0, -0.28, 0.06]}
        fontSize={0.035}
        color="#ffffff"
        raycast={() => null}
      >
        Salir de AR
      </Text>
    </group>
  )
}
