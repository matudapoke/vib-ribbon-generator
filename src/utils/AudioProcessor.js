export class AudioProcessor {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.source = null;
        this.destination = this.ctx.createMediaStreamDestination();
        this.pitchShifter = null;
        this.videoElement = null;
    }

    init(videoElement) {
        if (this.videoElement === videoElement) return; // Already initialized for this element

        if (this.source) {
            this.source.disconnect();
        }

        try {
            this.source = this.ctx.createMediaElementSource(videoElement);
            this.videoElement = videoElement;

            // Connect source to destination directly by default (bypass)
            // We will change routing when pitch shift is enabled
            this.source.connect(this.destination);

            // Also connect to speakers so user can hear it
            this.source.connect(this.ctx.destination);
        } catch (e) {
            console.warn("AudioProcessor: MediaElementSource already exists or failed", e);
        }
    }

    setHighPitch(enabled) {
        if (!this.source) return;

        this.source.disconnect();

        if (enabled) {
            // Create Pitch Shifter Graph
            if (!this.pitchShifter) {
                this.pitchShifter = this.createPitchShifter(this.ctx);
            }

            this.source.connect(this.pitchShifter.input);
            this.pitchShifter.output.connect(this.destination);
            this.pitchShifter.output.connect(this.ctx.destination);
        } else {
            this.source.connect(this.destination);
            this.source.connect(this.ctx.destination);
        }
    }

    createPitchShifter(ctx) {
        const input = ctx.createGain();
        const output = ctx.createGain();

        // "High Pitch" simulation using EQ and Ring Mod
        // Since we cannot change speed, we emphasize high frequencies and add a metallic texture
        // which mimics the "Vib-Ribbon" aesthetic (glitchy/high-pitched).

        const highPass = ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 800; // Cut everything below 800Hz

        const peaking = ctx.createBiquadFilter();
        peaking.type = 'peaking';
        peaking.frequency.value = 2000;
        peaking.Q.value = 1;
        peaking.gain.value = 15; // Boost highs significantly

        // Optional: Ring Modulator for "Robot/Glitch" feel (Vib-Ribbon style)
        // This adds a metallic overtone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 50; // Low frequency rumble/tremolo
        osc.start();

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.5; // Depth

        const ringMod = ctx.createGain();
        ringMod.gain.value = 0.0; // Initialize 

        // Ring Modulator graph:
        // Signal -> GainNode (controlled by Osc) -> Output
        // But standard Web Audio Ring Mod is: Signal * Osc.
        // We can do this by connecting Osc to Gain.gain of a GainNode that the signal passes through.

        const modulatorGain = ctx.createGain();
        modulatorGain.gain.value = 0; // Center at 0? No, center at 1 for AM, 0 for Ring Mod.
        // For Ring Mod, we need AudioParam modulation.

        // Let's stick to the EQ for now as it's safer and guaranteed to work without complex graph debugging.
        // The EQ alone (HighPass + Peaking) makes it sound "tinny" and "high".

        // Connect graph: Input -> HighPass -> Peaking -> Output
        input.connect(highPass);
        highPass.connect(peaking);
        peaking.connect(output);

        return { input, output };
    }
}
