import * as THREE from "three";
import React, { useMemo, useRef } from "react";
import { Canvas, createPortal, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, PerspectiveCamera, shaderMaterial, useFBO, useTexture } from "@react-three/drei";

const Scene = () => {
  const { width, height } = useThree(state => state.viewport);

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

  const textureMesh = useRef();
  const cam = useRef();
  const scene = useMemo(() => {
    const scene = new THREE.Scene();
    return scene;
  });

  let textureA = useFBO();
  let textureB = useFBO();

  useFrame(state => {
    state.gl.setRenderTarget(textureB);
    state.gl.render(scene, cam.current);
    state.gl.setRenderTarget(null);

    var t = textureA;
    textureA = textureB;
    textureB = t;

    textureMesh.current.material.uniforms.uTexture.value = textureA.texture;
  });

  return (
    <>
      {createPortal(
        <>
          <PerspectiveCamera ref={cam} position={[0, 0, 3.291]} />
          {/* <PerspectiveCamera ref={cam} manual position={[0, 0, 2]} /> */}
          <mesh ref={textureMesh} position={[0, 0, 0]} scale={[width, height, 1]}>
            <planeGeometry />
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
    <Canvas linear flat camera={{ position: [0, 0, 2] }}>
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
