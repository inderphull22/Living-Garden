import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "meshoptimizer";
import { useMemo, useRef, useEffect, Suspense } from "react";
import * as THREE from "three";

function Sculpture() {
  const gltf = useLoader(GLTFLoader, "/models/sculpture.glb", (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    scene.position.x -= center.x;
    scene.position.y -= center.y;
    scene.position.z -= center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    scene.scale.setScalar(scale);

    const finalBox = new THREE.Box3().setFromObject(scene);
    scene.position.y += -1 - finalBox.min.y;

    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          obj.material.envMapIntensity = 0.6;
          if ("roughness" in obj.material && obj.material.roughness < 0.55) {
            obj.material.roughness = 0.55;
          }
        }
      }
    });

    return scene;
  }, [gltf]);

  return <primitive object={model} />;
}

function GardenFlower({ item, color, index, total }) {
  const group = useRef();
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + index * 0.3;
  const radius = 0.7 + (index % 3) * 0.2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const height = 0.18 + item.health * 0.32;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + index) * 0.04;
  });

  return (
    <group ref={group} position={[x, -0.98, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.012, height, 6]} />
        <meshStandardMaterial color="#4a5530" roughness={0.8} />
      </mesh>
      <mesh position={[0, height + 0.02, 0]}>
        <sphereGeometry args={[0.04 + item.health * 0.025, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4 + item.health * 0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Creature({ id, index }) {
  const group = useRef();
  const radius = 1.2 + index * 0.1;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * (0.2 + index * 0.03) + index;
    group.current.position.x = Math.cos(t) * radius;
    group.current.position.y = 0.2 + Math.sin(t * 1.5) * 0.15;
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
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial
          color={colors[id]}
          emissive={colors[id]}
          emissiveIntensity={id === "firefly" ? 1.4 : 0.5}
        />
      </mesh>
      <mesh position={[0.05, 0.01, 0]} rotation={[0, 0, 0.4]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={colors[id]} transparent opacity={0.3} />
      </mesh>
      <mesh position={[-0.05, 0.01, 0]} rotation={[0, 0, -0.4]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={colors[id]} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 0]} receiveShadow>
      <circleGeometry args={[2.4, 64]} />
      <meshStandardMaterial color={0x0a0908} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.08} color={0xfff5e0} />
      <directionalLight
        position={[-2.5, 3.5, 2.5]}
        intensity={2.2}
        color={0xffe8c4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[3, 1.5, -2.5]} intensity={0.6} color={0x9ab4c4} />
      <directionalLight position={[0, -1, 1]} intensity={0.15} color={0xfff0d8} />
    </>
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

  return (
    <>
      <SceneLighting />
      <Floor />
      <Sculpture />
      {flowers.map((flower, index) => (
        <GardenFlower
          key={flower.id}
          item={flower.item}
          color={flower.color}
          index={index}
          total={flowers.length}
        />
      ))}
      {creatures.map((id, index) => (
        <Creature key={id} id={id} index={index} />
      ))}
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color="#333" wireframe />
    </mesh>
  );
}

export function GardenScene({ data }) {
  return (
    <div className="hero" aria-label="3D sculpture garden">
      <Canvas
        className="canvas3d"
        camera={{ position: [0, 0.2, 4], fov: 35, near: 0.1, far: 100 }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <GardenWorld data={data} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={2.2}
          maxDistance={7}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.62}
          autoRotate
          autoRotateSpeed={0.4}
          target={[0, 0, 0]}
        />
      </Canvas>
      <div className="hero-hint">Drag to rotate</div>
    </div>
  );
}
