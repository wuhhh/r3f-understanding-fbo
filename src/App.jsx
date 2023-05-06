import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, createPortal, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, PerspectiveCamera, shaderMaterial, useFBO, useTexture } from "@react-three/drei";

const Scene = () => {
  const texture = useTexture("/plants.jpg");

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

  const planeHeightAtDistance = useRef();
  const planeWidthAtDistance = useRef();
  const textureMesh = useRef();
  const cam = useRef();
  const scene = useMemo(() => {
    const scene = new THREE.Scene();
    return scene;
  });

  let textureA = useFBO();
  let textureB = useFBO();

  useFrame(state => {
    var distance = cam.current.position.z - textureMesh.current.position.z;
    var aspect = window.innerWidth / window.innerHeight;
    var vFov = (cam.current.fov * Math.PI) / 180;
    planeHeightAtDistance.current = 2 * Math.tan(vFov / 2) * distance;
    planeWidthAtDistance.current = planeHeightAtDistance.current * aspect;

    state.gl.setRenderTarget(textureB);
    state.gl.render(scene, cam.current);
    state.gl.setRenderTarget(null);

    var t = textureA;
    textureA = textureB;
    textureB = t;

    textureMesh.current.material.uniforms.uTexture.value = textureA.texture;
  });

  useEffect(() => {}, []);

  return (
    <>
      {createPortal(
        <>
          <PerspectiveCamera ref={cam} position={[0, 0, 3]} />
          <mesh ref={textureMesh} position={[0, 0, 0]}>
            <planeGeometry args={[planeWidthAtDistance.current, planeHeightAtDistance.current]} />
            <colorMaterial uTexture={texture} />
          </mesh>
        </>,
        scene
      )}
      {/* DISPLAY */}
      <mesh position={[-1.5, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial map={textureB.texture} />
      </mesh>
      {/* TEXTURE B / FBO 1 */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry />
        <colorMaterial uTexture={textureB.texture} />
      </mesh>
      {/* TEXTURE B / FBO 2 */}
      <mesh position={[1.5, 0, 0]}>
        <planeGeometry />
        <colorMaterial uTexture={textureA.texture} />
      </mesh>
    </>
  );
};

const App = () => {
  return (
    <Canvas linear flat>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} />
      <Scene />
      <OrbitControls makeDefault />
      <mesh scale={0.25} position={[0, 1, 0.5]}>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
    </Canvas>
  );
};

export default App;
