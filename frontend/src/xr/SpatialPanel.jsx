import { Text } from '@react-three/drei'

export default function SpatialPanel({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  title,
  children,
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh
        position={[0, 0, -0.035]}
        renderOrder={-2}
        raycast={() => null}
      >
        <planeGeometry args={[width + 0.008, height + 0.008]} />
        <meshBasicMaterial
          color="#527994"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      <mesh
        position={[0, 0, -0.025]}
        renderOrder={-1}
        raycast={() => null}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color="#101e33"
          transparent
          opacity={0.94}
          depthWrite={false}
        />
      </mesh>

      {title && (
        <Text
          position={[0, height / 2 - 0.065, 0.02]}
          fontSize={0.042}
          maxWidth={width - 0.04}
          color="#a5b4fc"
          raycast={() => null}
        >
          {title}
        </Text>
      )}

      {children}
    </group>
  )
}
