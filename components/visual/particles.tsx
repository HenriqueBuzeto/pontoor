"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";

const ENABLE_PARTICLES = process.env.NEXT_PUBLIC_ENABLE_PARTICLES === "true";

// Fundo de partículas futurista usando tsParticles (sem init customizado, compatível com 2.12.x)
export function Particles({ id }: { id?: string }) {
  const reactId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!ENABLE_PARTICLES || !mounted || typeof document === "undefined") {
    return null;
  }

  const ParticlesJS = dynamic(() => import("react-tsparticles"), { ssr: false });

  const fallbackId = `ponto-or-particles-${reactId.replaceAll(":", "")}`;
  const particlesId = id ?? fallbackId;

  return (
    <ParticlesJS
      id={particlesId}
      className="pointer-events-none absolute inset-0 -z-10"
      options={{
        fullScreen: { enable: false },
        fpsLimit: 60,
        detectRetina: true,
        background: {
          color: "transparent",
        },
        particles: {
          number: {
            value: 80,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: ["#f97316", "#fed7aa", "#facc15"],
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: 0.4,
            random: { enable: true, minimumValue: 0.15 },
          },
          size: {
            value: 2,
            random: { enable: true, minimumValue: 0.6 },
          },
          links: {
            enable: true,
            distance: 130,
            color: "#f97316",
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.6,
            direction: "none",
            random: false,
            straight: false,
            outModes: {
              default: "bounce",
            },
            warp: true,
          },
        },
        interactivity: {
          detectsOn: "window",
          events: {
            onHover: {
              enable: true,
              mode: ["grab", "bubble"],
            },
            onClick: {
              enable: true,
              mode: "push",
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 150,
              links: {
                opacity: 0.35,
              },
            },
            bubble: {
              distance: 170,
              size: 4,
              duration: 2,
              opacity: 0.6,
            },
            push: {
              quantity: 2,
            },
          },
        },
      }}
    />
  );
}


