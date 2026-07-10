let audioCtx;
let audioBuffer;
let sourceNode;

// --- MASSIVE ARENA CONCERT HALL IMPULSE MATRIX ---
function createMassiveArenaImpulse(context, duration = 5.5, decay = 2.2) {
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const percent = i / length;
        // Slow decay curve mimics massive physical sound scattering across hundreds of meters
        const damping = Math.pow(1 - percent, decay);
        
        // Pseudo-random dense ambient distribution for ultra-smooth tail
        left[i] = (Math.random() * 2 - 1) * damping;
        right[i] = (Math.random() * 2 - 1) * damping;
    }
    return impulse;
}

document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();

    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
        audioBuffer = buffer;
        alert("💎 Massive Arena Studio Engine Operational!");
    });
});

// --- THE GRAND ARENA PIPELINE ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. TEMPO LAYER
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.setValueAtTime(speedVal, context.currentTime);

    // 2. EQUALIZER BANDS (Deep Lo-Fi Base Preset)
    const bassEQ = context.createBiquadFilter();
    bassEQ.type = "lowshelf";
    bassEQ.frequency.value = 140;
    bassEQ.gain.value = parseFloat(document.getElementById('eqBass').value);

    const midEQ = context.createBiquadFilter();
    midEQ.type = "peaking";
    midEQ.Q.value = 0.7;
    midEQ.frequency.value = 1100;
    midEQ.gain.value = parseFloat(document.getElementById('eqMid').value);

    const trebleEQ = context.createBiquadFilter();
    trebleEQ.type = "highshelf";
    trebleEQ.frequency.value = 3800;
    trebleEQ.gain.value = parseFloat(document.getElementById('eqTreble').value);

    source.connect(bassEQ);
    bassEQ.connect(midEQ);
    midEQ.connect(trebleEQ);
    let currentMaster = trebleEQ;

    // 3. NOISE CONTROL GATE
    const noiseEnabled = document.getElementById('noiseToggle').checked;
    if (noiseEnabled) {
        const studioComp = context.createDynamicsCompressor();
        studioComp.threshold.setValueAtTime(-40, context.currentTime);
        studioComp.knee.setValueAtTime(15, context.currentTime);
        studioComp.ratio.setValueAtTime(4, context.currentTime);
        studioComp.attack.setValueAtTime(0.005, context.currentTime);
        studioComp.release.setValueAtTime(0.06, context.currentTime);
        
        currentMaster.connect(studioComp);
        currentMaster = studioComp;
    }

    // 4. BALANCED DRY/WET MATRIX
    const dryGain = context.createGain();
    const wetGain = context.createGain();

    const reverbMix = parseFloat(document.getElementById('reverb').value);
    dryGain.gain.value = 1.0; 
    // Amplified wet signal mapping to handle the massive room size reflection power
    wetGain.gain.value = reverbMix * 1.6; 

    // 5. CONVOLVER SPACE ENGINE
    const convolver = context.createConvolver();
    convolver.buffer = createMassiveArenaImpulse(context, 5.5, 2.2);

    // Reverb Quality High & Low Filters
    const reverbHighPass = context.createBiquadFilter();
    reverbHighPass.type = "highpass";
    reverbHighPass.frequency.value = 180; 

    const reverbLowPass = context.createBiquadFilter();
    reverbLowPass.type = "lowpass";
    // Raised to 1400Hz to capture large room air reflections properly
    reverbLowPass.frequency.value = 1400; 

    // Pipeline Connections (Zero-Delay Single Vocal Structure)
    currentMaster.connect(reverbHighPass);
    reverbHighPass.connect(reverbLowPass);
    reverbLowPass.connect(convolver);
    convolver.connect(wetGain);

    currentMaster.connect(dryGain);

    // Terminal Output
    const destination = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(destination);
    wetGain.connect(destination);

    return source;
}

// --- RUNNERS AND TRIGGERS ---
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle file load karo!");
    if (sourceNode) { try { sourceNode.stop(); } catch(e) {} }

    sourceNode = setupAudioPipeline(audioCtx, audioBuffer, false);
    sourceNode.start(0);
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!audioBuffer) return alert("Pehle file check karo!");

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerText = "Master Rendering...";
    downloadBtn.disabled = true;

    const speedVal = parseFloat(document.getElementById('speed').value);
    const renderDuration = (audioBuffer.duration / speedVal) + 8; // Extra head space for mega tail decay

    const offlineCtx = new OfflineAudioContext(1, renderDuration * audioBuffer.sampleRate, audioBuffer.sampleRate);
    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    
    offlineSource.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const mp3Blob = bufferToMp3(renderedBuffer);

    const downloadUrl = URL.createObjectURL(mp3Blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'studio_x_grand_arena.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.innerText = "Export MP3";
    downloadBtn.disabled = false;
    alert("🎉 Massive Arena Master MP3 Downloaded!");
});

// --- LAMEJS STREAM COMPRESSION ENGINE ---
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
