import { useCallback } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const particlesInit = async (engine) => {
    await loadSlim(engine);
};

const ParticleBackground = () => {
    const particlesLoaded = useCallback(async (container) => {
        // optional: console.log("Particles loaded", container);
    }, []);

    const options = {
        background: { color: { value: "transparent" } },
        fpsLimit: 120,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "grab" },
            },
            modes: {
                grab: { distance: 150, links: { opacity: 0.5 } },
            },
        },
        particles: {
            color: { value: "#55e0ff" },
            links: {
                color: "#55e0ff",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
            },
            move: {
                enable: true,
                speed: 1.2,
                direction: "none",
                random: false,
                straight: false,
                outModes: { default: "out" },
            },
            number: {
                density: { enable: true, area: 800 },
                value: 80,
            },
            opacity: { value: 0.3 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
        },
        detectRetina: true,
    };

    return (
        <ParticlesProvider init={particlesInit}>
            <Particles
                id="tsparticles"
                className="absolute inset-0 -z-10"
                options={options}
                particlesLoaded={particlesLoaded}
            />
        </ParticlesProvider>
    );
};

export default ParticleBackground;