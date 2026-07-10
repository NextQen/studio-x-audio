let audioCtx;
let audioBuffer;
let sourceNode;

document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    
    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
        audioBuffer = buffer;
        alert("💎 Ultimate Studio Engine Locked & Armed! (100/100 Quality)");
    }, (err) => {
        alert("Audio decode failed.");
    });
});

// --- HELPER: CONCERT HALL IMPULSE GENERATOR (THE AUDIOALTER SECRET) ---
// Ye function browser ke andar hi mathematically ek massive stadium/cathedral ka room design karta hai
function createConcertHallImpulse(context, duration = 3.5, decay = 4.0) {
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        // Exponential decay equation to match true acoustic physics
        const percent = i / length;
        const damping = Math.exp(-percent * decay);
        
        // Random white noise shaped by dynamic decay to mimic sound scattering in walls
        left[i] = (Math.random() * 2 - 1) * damping;
        right[i] = (Math.random() * 2 - 1) * damping;
    }
    return impulse;
}

// --- MASTER AUDIO PIPELINE ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. DYNAMIC SLOWED LAYER (Deep Pitch Compression)
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.setValueAtTime(speedVal, context.currentTime);

    // 2. AUDIOALTER-GRADE DYNAMIC NOISE GATE & CLEANUP
    // Pehle lagayenge taaki sirf saaf audio par hi heavy reverb apply ho
    const noiseEnabled = document.getElementById('noiseToggle').checked;
    let currentNode = source;

    if (noiseEnabled) {
        const noiseGate = context.createDynamicsCompressor();
        noiseGate.threshold.setValueAtTime(-42, context.currentTime);
        noiseGate.knee.setValueAtTime(18, context.currentTime);
        noiseGate.ratio.setValueAtTime(4, context.currentTime);
        noiseGate.attack.setValueAtTime(0.005, context.currentTime);
        noiseGate.release.setValueAtTime(0.08, context.currentTime);
        
        currentNode.connect(noiseGate);
        currentNode = noiseGate;
    }

    // 3. 3-BAND MASTERING EQUALIZER (Warm Vinyl Tone Signature)
    const bassEQ = context.createBiquadFilter();
    bassEQ.type = "lowshelf";
    bassEQ.frequency.value = 140;
    bassEQ.gain.value = parseFloat(document.getElementById('eqBass').value);

    const midEQ = context.createBiquadFilter();
    midEQ.type = "peaking";
    midEQ.Q.value = 0.8; // Smooth bell curve
    midEQ.frequency.value = 1100;
    midEQ.gain.value = parseFloat(document.getElementById('eqMid').value);

    const trebleEQ = context.createBiquadFilter();
    trebleEQ.type = "highshelf";
    trebleEQ.frequency.value = 3600;
    trebleEQ.gain.value = parseFloat(document.getElementById('eqTreble').value);

    // Link EQ Pipeline
    currentNode.connect(bassEQ);
    bassEQ.connect(midEQ);
    midEQ.connect(trebleEQ);
    currentNode = trebleEQ;

    // 4. THE ULTIMATE REVERB ENGINE (Convolver Technology)
    const convolver = context.createConvolver();
    // Mathematical spatial mapping buffer link
    convolver.buffer = createConcertHallImpulse(context, 3.8, 4.5);

    // Reverb Tail Tone Smoothing (High Damping to make it dark and lo-fi)
    const reverbDamping = context.createBiquadFilter();
    reverbDamping.type = "lowpass";
    reverbDamping.frequency.value = 850; // Sweeter dark cutoff frequency

    // Dry/Wet Splitting System
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    
    const reverbMix = parseFloat(document.getElementById('reverb').value);
    
    // Balanced power equations for rich atmosphere
    dryGain.gain.value = 0.95; 
    wetGain.gain.value = reverbMix * 1.2; // Boosting wet signal slightly for huge concert feel

    // Route Signal into parallel chains
    currentNode.connect(dryGain);
    
    currentNode.connect(convolver);
    convolver.connect(reverbDamping);
    reverbDamping.connect(wetGain);

    // Final Stage: Summation out to output terminal
    const outputTerminal = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(outputTerminal);
    wetGain.connect(outputTerminal);

    return source;
}

// --- COMMAND CONTROLLERS ---
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Bhai file toh upload karo!");
    if (sourceNode) { try { sourceNode.stop(); } catch(e) {} }

    sourceNode = setupAudioPipeline(audioCtx, audioBuffer, false);
    sourceNode.start(0);
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!audioBuffer) return alert("Pehle file lagao!");

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerText = "Mastering & Encoding...";
    downloadBtn.disabled = true;

    const speedVal = parseFloat(document.getElementById('speed').value);
    const renderDuration = (audioBuffer.duration / speedVal) + 7; 

    const offlineCtx = new OfflineAudioContext(1, renderDuration * audioBuffer.sampleRate, audioBuffer.sampleRate);
    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    
    offlineSource.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const mp3Blob = bufferToMp3(renderedBuffer);

    const downloadUrl = URL.createObjectURL(mp3Blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'studio_x_100_rating_mix.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.innerText = "Export MP3";
    downloadBtn.disabled = false;
    alert("🎉 Master Quality 100/100 MP3 Exported!");
});

// --- LAMEJS CORE ENCODER MODULE ---
function bufferToMp3(buffer) {
    const rawAudioChannel = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3DataChunks = [];

    const pcmSamples = new Int16Array(rawAudioChannel.length);
    for (let i = 0; i < rawAudioChannel.length; i++) {
        let sample = Math.max(-1, Math.min(1, rawAudioChannel[i]));
        pcmSamples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    const blockSize = 1152; 
    for (let i = 0; i < pcmSamples.length; i += blockSize) {
        const sampleChunk = pcmSamples.subarray(i, i + blockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) mp3DataChunks.push(new Uint8Array(mp3buf));
    }

    const flushedBuf = mp3encoder.flush();
    if (flushedBuf.length > 0) mp3DataChunks.push(new Uint8Array(flushedBuf));

    return new Blob(mp3DataChunks, { type: 'audio/mp3' });
}
