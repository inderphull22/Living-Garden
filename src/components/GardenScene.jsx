import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

function GardenFlower({ item, color, index }) {
  const group = useRef();
  const angle = index * 1.42;
  const radius = 0.25 + (index % 4) * 0.16;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const height = 0.28 + item.health * 0.48;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + index) * 0.045;
  });

  return (
    <group ref={group} position={[x, -0.05, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.013, 0.018, height, 8]} />
        <meshStandardMaterial color="#5d7f63" roughness={0.75} />
      </mesh>
      <mesh position={[0, height + 0.03, 0]}>
        <sphereGeometry args={[0.065 + item.health * 0.035, 18, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55 + item.health * 0.8}
          roughness={0.22}
        />
      </mesh>
    </group>
  );
}

function Creature({ id, index }) {
  const group = useRef();
  const radius = 0.9 + index * 0.08;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * (0.25 + index * 0.035) + index;
    group.current.position.x = Math.cos(t) * radius;
    group.current.position.y = 0.64 + Math.sin(t * 1.7) * 0.12;
    group.current.position.z = Math.sin(t) * radius;
    group.current.rotation.y = -t;
  });

  const colors = {
    butterfly: "#ffb7d5",
    firefly: "#e8ff8f",
    beetle: "#96ffca",
    moth: "#c2b4ff",
    dragonfly: "#8fd8ff",
  };

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color={colors[id]}
          emissive={colors[id]}
          emissiveIntensity={id === "firefly" ? 1.4 : 0.5}
        />
      </mesh>
      <mesh position={[0.06, 0.015, 0]} rotation={[0, 0, 0.45]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={colors[id]} transparent opacity={0.35} />
      </mesh>
      <mesh position={[-0.06, 0.015, 0]} rotation={[0, 0, -0.45]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={colors[id]} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function CortexPlanter({ garden }) {
  const pollutionColor = garden.pollution > 0.5 ? "#423a35" : "#252522";
  const waterGlow = garden.water > 0.7 ? "#8fd8ff" : "#515f68";

  return (
    <group>
      <mesh position={[0, -0.53, 0]} scale={[1.08, 1.22, 0.92]}>
        <sphereGeometry args={[0.78, 48, 32]} />
        <meshStandardMaterial color="#5a5852" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.02, 0]} scale={[1.04, 0.2, 0.86]}>
        <sphereGeometry args={[0.82, 48, 20]} />
        <meshStandardMaterial color="#11110f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, 0]} scale={[0.9, 0.12, 0.7]}>
        <sphereGeometry args={[0.74, 40, 16]} />
        <meshStandardMaterial color={pollutionColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.77, 0.035, 16, 64]} />
        <meshStandardMaterial color="#77746b" roughness={0.86} />
      </mesh>
      <mesh position={[0.37, -0.52, 0.62]} scale={[0.18, 0.1, 0.04]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#171715" roughness={0.9} />
      </mesh>
      <mesh position={[-0.37, -0.52, 0.62]} scale={[0.18, 0.1, 0.04]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#171715" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.73, 0.64]} scale={[0.24, 0.055, 0.035]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#26231f" roughness={0.9} />
      </mesh>
      <pointLight position={[0, 0.32, 0]} color={waterGlow} intensity={0.6} distance={2.4} />
    </group>
  );
}

function GardenWorld({ data }) {
  const flowers = useMemo(() => {
    const entries = [];
    for (const [id, item] of Object.entries(data.garden.flowers)) {
      for (let i = 0; i < item.count; i += 1) {
        entries.push({
          id: `${id}-${i}`,
          species: id,
          item,
          color: data.catalog.flowers[id].color,
        });
      }
    }
    return entries;
  }, [data]);

  const creatures = Object.entries(data.garden.creatures)
    .filter(([, item]) => item.attracted)
    .map(([id]) => id);

  const isNight = data.garden.dayPhase === "night" || data.garden.dayPhase === "dusk";
  const weatherTint = {
    clear: "#f5d9a0",
    rain: "#9fc7ff",
    fog: "#c8c7d6",
    storm: "#8d9ac4",
    moonlight: "#b9d8ff",
  }[data.garden.weather];

  return (
    <>
      <color attach="background" args={[isNight ? "#050507" : "#0b0b0b"]} />
      <fog attach="fog" args={[data.garden.weather === "fog" ? "#12131a" : "#050507", 2.2, 5.8]} />
      <ambientLight intensity={isNight ? 0.28 : 0.48} color={weatherTint} />
      <directionalLight position={[2, 4, 2]} intensity={isNight ? 0.6 : 0.9} color={weatherTint} />
      <pointLight position={[-1.8, 1.4, 1.6]} intensity={0.6} color="#a98fff" />
      <CortexPlanter garden={data.garden} />
      {flowers.map((flower, index) => (
        <GardenFlower key={flower.id} item={flower.item} color={flower.color} index={index} />
      ))}
      {creatures.map((id, index) => (
        <Creature key={id} id={id} index={index} />
      ))}
    </>
  );
}

export function GardenScene({ data }) {
  return (
    <div className="scene-frame" aria-label="Sculptural concrete head planter containing the living garden">
      <Canvas camera={{ position: [0, 1.1, 3.25], fov: 42 }}>
        <GardenWorld data={data} />
      </Canvas>
    </div>
  );
}
