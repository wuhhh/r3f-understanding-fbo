/**
 * Based on https://code.tutsplus.com/how-to-write-a-smoke-shader--cms-25587t
 * Ported to React Three Fiber by Huw Roberts (huwroberts.net)
 */

import * as THREE from "three";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { shaderMaterial, useFBO } from "@react-three/drei";
import { Leva, useControls } from "leva";

const smokeShader = /* glsl */ `
	precision mediump float;

	// Add:
	// uSmokeDistance: The distance of the smoke from the source
	// uDiffuseMult1: The amount of diffusion
	// uDiffuseMult2: The amount of diffusion
	// uDiffuseDownMult: The amount of down diffusion
	// uDiffuseUpMult: The amount of up diffusion

	uniform float uSmokeDistance;
	uniform float uDiffuseMult1;
	uniform float uDiffuseMult2;
	uniform float uDiffuseDownMult;
	uniform float uDiffuseUpMult;
	uniform vec2 uRes; // The width and height of our screen
	uniform vec3 uSmokeSource; // The x,y are the posiiton. The z is the power/density
	uniform sampler2D uTexture; // Our input texture
	uniform float uTime; // The time in seconds

	varying vec2 vUv;

	void main() {
		vec2 fragCoord = gl_FragCoord.xy;
		fragCoord *= 0.5;
		vec2 pixel = fragCoord.xy / uRes.xy;
		gl_FragColor = texture2D( uTexture, pixel );

		// Get the distance of the current pixel from the smoke source
		float dist = distance(uSmokeSource.xy,fragCoord.xy);
		// Generate smoke when mouse is pressed
		gl_FragColor.rgb += uSmokeSource.z * max(uSmokeDistance-dist,0.0);

		// Smoke diffuse
		float xPixel = 1.0/uRes.x;//The size of a single pixel
		float yPixel = 1.0/uRes.y;
		vec4 rightColor = texture2D(uTexture,vec2(pixel.x+xPixel,pixel.y));
		vec4 leftColor = texture2D(uTexture,vec2(pixel.x-xPixel,pixel.y));
		vec4 upColor = texture2D(uTexture,vec2(pixel.x,pixel.y+yPixel));
		vec4 downColor = texture2D(uTexture,vec2(pixel.x,pixel.y-yPixel));

		// Handle the bottom boundary 
		if(pixel.y <= yPixel){
			downColor.rgb = vec3(0.0);
		}

		// Diffuse equation
		float factor = uDiffuseMult1 * uDiffuseMult2 * (leftColor.r + rightColor.r + downColor.r * uDiffuseDownMult + upColor.r - uDiffuseUpMult * gl_FragColor.r);

		// Account for low precision of texels
		// This seems to be unnecessary
		// float minimum = 0.003;
		// if (factor >= -minimum && factor < 0.0) factor = -minimum;

		gl_FragColor.rgb += factor;
	}
`;

const colorMaterial = shaderMaterial(
  {
    uSmokeDistance: 0.0,
    uDiffuseMult1: 0.0,
    uDiffuseMult2: 0.0,
    uDiffuseDownMult: 0.0,
    uDiffuseUpMult: 0.0,
    uRes: null,
    uSmokeSource: null,
    uTexture: null,
    uTime: 0,
  },
  /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
  smokeShader
);

extend({ ColorMaterial: colorMaterial });

const FBOScene = ({ ...props }) => {
  const bufferMaterial = useRef();

  // Controls
  const config = useControls(
    "smoke",
    {
      uSmokeDistance: {
        value: 15.0,
        min: 0.0,
        max: 30.0,
        step: 0.1,
      },
      uDiffuseMult1: {
        value: 8.0,
        min: 0.0,
        max: 12.0,
        step: 0.1,
      },
      // This is 1/60 fps
      uDiffuseMult2: {
        value: 0.016,
        min: 0.0,
        max: 0.1,
        step: 0.001,
      },
      uDiffuseDownMult: {
        value: 3.0,
        min: 0.0,
        max: 6.0,
        step: 0.1,
      },
      uDiffuseUpMult: {
        value: 6.0,
        min: 0.0,
        max: 12.0,
        step: 0.1,
      },
    },
    { collapsed: true }
  );

  // Create buffer scene
  const bufferScene = useMemo(() => new THREE.Scene(), []);

  // Default camera
  const camera = useThree(state => state.camera);

  // Viewport size
  const { width, height } = useThree(state => state.viewport);

  // Create 2 buffer textures
  let textureA = useFBO();
  let textureB = useFBO();

  // Set min filter mag filter
  textureA.texture.minFilter = THREE.LinearFilter;
  textureA.texture.magFilter = THREE.NearestFilter;
  textureB.texture.minFilter = THREE.LinearFilter;
  textureB.texture.magFilter = THREE.NearestFilter;

  // Pass textureA to shader
  bufferMaterial.current = new colorMaterial({
    uSmokeDistance: config.uSmokeDistance,
    uDiffuseMult1: config.uDiffuseMult1,
    uDiffuseMult2: config.uDiffuseMult2,
    uDiffuseDownMult: config.uDiffuseDownMult,
    uDiffuseUpMult: config.uDiffuseUpMult,
    uRes: new THREE.Vector2(window.innerWidth, window.innerHeight),
    uSmokeSource: new THREE.Vector3(0, 0, 0),
    uTexture: textureA.texture,
    uTime: 0,
  });

  // Buffer plane scaled to viewport size
  const plane = new THREE.PlaneGeometry(1, 1);
  const bufferObject = new THREE.Mesh(plane, bufferMaterial.current);
  bufferObject.scale.set(width, height, 1);
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
    bufferMaterial.current.uniforms.uTexture.value = textureA.texture;
  });

  const updateMousePosition = (x, y) => {
    const mouseX = x;
    const mouseY = window.innerHeight - y;
    bufferMaterial.current.uniforms.uSmokeSource.value.x = mouseX;
    bufferMaterial.current.uniforms.uSmokeSource.value.y = mouseY;
  };

  useEffect(() => {
    window.addEventListener("mousemove", event => {
      updateMousePosition(event.clientX, event.clientY);
    });

    window.addEventListener("mousedown", event => {
      bufferMaterial.current.uniforms.uSmokeSource.value.z = 0.1;
    });

    window.addEventListener("mouseup", event => {
      bufferMaterial.current.uniforms.uSmokeSource.value.z = 0;
    });
  }, []);

  return (
    <>
      <Leva hidden />
      <mesh ref={meshDisplay} scale={[width, height, 1]} position={[0, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial map={textureB.texture} />
      </mesh>
    </>
  );
};

const App = () => {
  return (
    <>
      <Canvas linear flat camera={{ fov: 75, position: [0, 0, 2.5] }}>
        <FBOScene />
      </Canvas>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "11px",
          color: "white",
          textTransform: "uppercase",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          padding: "16px",
          letterSpacing: "1px",
          lineHeight: "1rem",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        Draw with your mouse
      </div>
    </>
  );
};

export default App;
