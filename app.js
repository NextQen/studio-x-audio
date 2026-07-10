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
        alert("✨ Pristine Zero-Loop Engine Loaded! (Sarsarahat Completely Blocked)");
    });
});

// --- AUDIOALTER MULTI-TAP STUDIO ENGINE (NO FEEDBACK LOOPS) ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. PERFECT SLOWED SPEED (Pitch and Tempo drop automatically)
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.setValueAtTime(speedVal, context.currentTime);

    // 2. TRUE LO-FI EQUALIZER (Warm Analog Signature)
    const heavyBass = context.createBiquadFilter();
    heavyBass.type = "lowshelf";
    heavyBass.frequency.value = 130; 
    heavyBass.gain.value = parseFloat(document.getElementById('eqBass').value) + 6; // Heavy low-end punch

    const midWarmth = context.createBiquadFilter();
    midWarmth.type = "peaking";
    midWarmth.Q.value = 0.5;
    midWarmth.frequency.value = 1000;
    midWarmth.gain.value = parseFloat(document.getElementById('eqMid').value);

    const lofiHighCut = context.createBiquadFilter();
    lofiHighCut.type = "lowpass"; 
    // Harsh digital elements ko 3200Hz par hi lock kar diya taaki chubhnewali aawaz na aaye
    lofiHighCut.frequency.value = 3200; 

    source.connect(heavyBass);
    heavyBass.connect(midWarmth);
    midWarmth.connect(lofiHighCut);
    let masterAudio = lofiHighCut;

    // 3. MASTER STUDIO DYNAMICS CONTROL
    const noiseEnabled = document.getElementById('noiseToggle').checked;
    if (noiseEnabled) {
        const studioComp = context.createDynamicsCompressor();
        studioComp.threshold.setValueAtTime(-35, context.currentTime);
        studioComp.knee.setValueAtTime(10, context.currentTime);
        studioComp.ratio.setValueAtTime(4, context.currentTime);
        studioComp.attack.setValueAtTime(0.005, context.currentTime);
        studioComp.release.setValueAtTime(0.06, context.currentTime);
        
        masterAudio.connect(studioComp);
        masterAudio = studioComp;
    }

    // ================================================================
    // 4. THE ZERO-LOOP MASSIVE STUDIO SPACE ENGINE (No Feedback = No Hiss)
    // ================================================================
    // Koi loop nahi hai! Hum 5 alag-alag lambe time delays ko side-by-side
    // chalayenge. Ye bina sarsarahat ke ek anant (infinite) room scale dega.
    
    const reverbMix = parseFloat(document.getElementById('reverb').value);
    const wetGain = context.createGain();
    wetGain.gain.value = reverbMix * 1.8; // Amplified for massive arena depth

    // Filters jo sirf reverb tail ko deep aur fluid banayenge
    const reverbFilter = context.createBiquadFilter();
    reverbFilter.type = "lowpass";
    reverbFilter.frequency.value = 1200; 

    // 5 Multi-Tap Parallel Delay Points (Massive Studio Architecture)
    const delayTimes = [0.35, 0.52, 0.68, 0.85, 1.15]; // Bada studio scaling upto 1.15 seconds
    const tapGains = [0.45, 0.40, 0.35, 0.30, 0.25];   // Distant fading effect

    delayTimes.forEach((time, index) => {
        const delayNode = context.createDelay();
        delayNode.delayTime.value = time;

        const gainNode = context.createGain();
        gainNode.gain.value = tapGains[index];

        // Pipeline: Master -> Delay -> Tone Filter -> Gain -> Main Wet Output
        masterAudio.connect(delayNode);
        delayNode.connect(reverbFilter);
        reverbFilter.connect(gainNode);
        gainNode.connect(wetGain);
    });

    // 5. MASTER DRY/WET MIX CLOSURE
    const dryGain = context.createGain();
    dryGain.gain.value = 1.0; // Clean, crystal clear upfront vocals

    masterAudio.connect(dryGain);

    // Final Stage Routing
    const destination = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(destination);
    wetGain.connect(destination);

    return source;
}

// --- RUNNERS AND CONTROLLERS ---
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle song upload karo!");
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
    const renderDuration = (audioBuffer.duration / speedVal) + 8; 

    const offlineCtx = new OfflineAudioContext(1, renderDuration * audioBuffer.sampleRate, audioBuffer.sampleRate);
    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    
    offlineSource.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const mp3Blob = bufferToMp3(renderedBuffer);

    const downloadUrl = URL.createObjectURL(mp3Blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'studio_x_pristine_master.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.innerText = "Export MP3";
    downloadBtn.disabled = false;
    alert("🎉 Pristine Master MP3 Downloaded!");
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
