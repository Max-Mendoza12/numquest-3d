import { useState } from 'react'
import { Text } from '@react-three/drei'

export default function SpatialButton({
  label,
  position,
  onClick,
  width = 0.38,
  height = 0.09,
  color = '#203b54',
  disabled = false,
  overlay = false,
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={position}>
      <mesh
        renderOrder={overlay ? 1002 : 0}
        pointerEventsType={{ deny: 'grab' }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={event => {
          event.stopPropagation()
          if (!disabled) onClick?.()
        }}
      >
        <boxGeometry args={[width, height, 0.025]} />
        <meshBasicMaterial
          transparent={overlay}
          depthTest={!overlay}
          depthWrite={!overlay}
          color={disabled
            ? '#263244'
            : hovered ? '#0891b2' : color}
        />
      </mesh>

      <Text
        position={[0, 0, 0.019]}
        fontSize={0.033}
        renderOrder={overlay ? 1003 : 0}
        material-depthTest={!overlay}
        material-depthWrite={false}
        maxWidth={width - 0.025}
        color={disabled ? '#64748b' : '#f1f5f9'}
        textAlign="center"
        raycast={() => null}
      >
        {label}
      </Text>
    </group>
  )
}
