import * as THREE from "three";
import React, { useMemo, useRef } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, shaderMaterial, useFBO, useTexture } from "@react-three/drei";

const colorMaterial = shaderMaterial(
  { uTexture: null, uTime: 0 },
  // vertex
  /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
  // fragment
  /* glsl */ `
		uniform sampler2D uTexture;
		varying vec2 vUv;
		void main() {
			vec4 texture = texture2D(uTexture, vUv);
			gl_FragColor = vec4(texture);
			gl_FragColor.r += 0.001;
		}
	`
);

extend({ ColorMaterial: colorMaterial });

const FBOScene = ({ ...props }) => {
  const texture = useTexture("/plants.jpg");

  // Create buffer scene
  const bufferScene = useMemo(() => new THREE.Scene(), []);

  // Default camera
  const camera = useThree(state => state.camera);

  // Viewport size
  const { width, height } = useThree(state => state.viewport);

  // Create 2 buffer textures
  let textureA = useFBO();
  let textureB = useFBO();

  // Pass textureA to shader
  const bufferMaterial = new colorMaterial({ uTexture: texture });

  // Buffer plane scaled to viewport size
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.scale(width, height, 1);
  const bufferObject = new THREE.Mesh(plane, bufferMaterial);
  bufferScene.add(bufferObject);

  const meshDisplay = useRef();

  useFrame((state, delta) => {
    state.gl.setRenderTarget(textureB);
    state.gl.render(bufferScene, camera);
    state.gl.setRenderTarget(null);
    const t = textureA;
    textureA = textureB;
    textureB = t;
    meshDisplay.current.material.map = textureB.texture;
    bufferMaterial.uniforms.uTexture.value = textureA.texture;
  });

  return (
    <>
      <mesh ref={meshDisplay} scale={[width, height, 1]} position={[0, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial map={textureB.texture} />
      </mesh>
    </>
  );
};

const Scene = () => {
  const box = useRef();

  useFrame((_, delta) => {
    box.current.rotation.x += delta;
    box.current.rotation.y -= delta * 0.75;
    box.current.rotation.z += delta * 0.66;
  });

  return (
    <mesh ref={box} scale={0.25} position={[0, 1, 0.5]}>
      <boxGeometry />
      <meshNormalMaterial />
    </mesh>
  );
};

const App = () => {
  return (
    <Canvas linear flat camera={{ fov: 75, position: [0, 0, 2.5] }}>
      <FBOScene />
      <Scene />
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default App;
