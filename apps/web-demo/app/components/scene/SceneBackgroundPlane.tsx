"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Mesh, TextureLoader, Vector3 } from "three";

import { useSceneStore } from "@pointclick-engine/engine-core";

/** Precarga el fondo de una escena en el caché del navegador. */
export function preloadSceneBackground(url: string): void {
  if (typeof window === "undefined" || !url) return;
  const img = new window.Image();
  img.src = url;
}

export function SceneBackgroundPlane({
  url,
  onReady,
}: {
  url: string | null | undefined;
  onReady?: () => void;
}) {
  const [texture, setTexture] = useState<import("three").Texture | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const groundCenterXRef = useRef<number>(0);
  const ground = useSceneStore((s) => s.scene.ground);
  const sceneId = useSceneStore((s) => s.sceneId);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  useEffect(() => {
    if (!url) return;

    const loader = new TextureLoader();
    let mounted = true;
    let loadedTexture: import("three").Texture | null = null;

    loader.load(
      url,
      (tex) => {
        if (!mounted) {
          tex.dispose();
          return;
        }

        loadedTexture = tex;
        setTexture(tex);
        onReadyRef.current?.();
      },
      undefined,
      (err) => {
        console.warn("SceneBackgroundPlane: texture load error", err);
      },
    );

    return () => {
      mounted = false;
      if (loadedTexture) {
        loadedTexture.dispose();
      }
    };
  }, [url]);

  useEffect(() => {
    groundCenterXRef.current = (ground.minX + ground.maxX) / 2;
  }, [sceneId]);

  let aspect = 16 / 9;
  const textureImage = texture?.image as { width?: number; height?: number } | undefined;
  if (textureImage?.width && textureImage?.height) {
    aspect = textureImage.width / textureImage.height;
  }

  const height = 19.28;
  const groundCenterX = groundCenterXRef.current;
  const width = height * aspect;

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    const dir = new Vector3();
    camera.getWorldDirection(dir);
    const distance = 10;
    meshRef.current.position.copy(camera.position).addScaledVector(dir, distance);
    meshRef.current.position.x = groundCenterX;
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  if (!url) return null;
  if (!texture) return null;

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-100}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} side={DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
  );
}