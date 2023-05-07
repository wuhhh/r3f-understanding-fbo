import * as THREE from "three";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, createPortal, extend, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, shaderMaterial, useFBO, useTexture } from "@react-three/drei";

const ColorMaterial = shaderMaterial(
  { uTexture: new THREE.Texture(), uTime: 0 },
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

extend({ ColorMaterial });

const FBOScene = ({ ...props }) => {
  useTexture("/plants.jpg", texture => {
    meshPortal.current.material.uniforms.uTexture.value = texture;
  });

  const meshDisplay = useRef();
  const meshTextureA = useRef();
  const meshTextureB = useRef();
  const meshPortal = useRef();
  const cam = useRef();
  const [scene] = useState(() => new THREE.Scene());

  let textureA = useFBO();
  let textureB = useFBO();

  const setPlaneSize = () => {
    var distance = cam.current.position.z - meshPortal.current.position.z;
    var aspect = textureA.viewport.width / textureA.viewport.height;
    var vFov = (cam.current.fov * Math.PI) / 180;
    let planeHeight = 2 * Math.tan(vFov / 2) * distance;
    let planeWidth = planeHeight * aspect;
    meshPortal.current.scale.y = planeHeight;
    meshPortal.current.scale.x = planeWidth;
  };

  useFrame((state, delta) => {
    setPlaneSize();
    state.gl.setRenderTarget(textureB);
    state.gl.render(scene, cam.current);
    state.gl.setRenderTarget(null);
    var t = textureA;
    textureA = textureB;
    textureB = t;
    meshPortal.current.material.uniforms.uTexture.value = textureA.texture;

    meshDisplay.current.rotation.z += delta;
    meshTextureA.current.rotation.z += delta;
    meshTextureB.current.rotation.z += delta;
  });

  useEffect(() => {
    setPlaneSize();
  }, []);

  return (
    <>
      {createPortal(
        <>
          <PerspectiveCamera ref={cam} position={[0, 0, 3]} />
          <mesh ref={meshPortal} position={[0, 0, 0]}>
            <planeGeometry />
            <colorMaterial />
          </mesh>
        </>,
        scene
      )}
      {/* DISPLAY */}
      <mesh ref={meshDisplay} position={[-1.5, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial map={textureB.texture} />
      </mesh>
      {/* TEXTURE B / FBO 1 */}
      <mesh ref={meshTextureB} position={[0, 0, 0]}>
        <planeGeometry />
        <colorMaterial uTexture={textureB.texture} />
      </mesh>
      {/* TEXTURE A / FBO 2 */}
      <mesh ref={meshTextureA} position={[1.5, 0, 0]}>
        <planeGeometry />
        <colorMaterial uTexture={textureA.texture} />
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
