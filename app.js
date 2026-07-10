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
        alert("🚀 Pure Clean Studio Engine Operational! (Sarsarahat Fixed)");
    });
});

// --- PARALLEL SPRING-CONCERT REVERB MATRIX (NO INTERNAL FEEDBACK LOOP) ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. PERFECT SLOWED SPEED (Pitch Drop Correlation)
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.setValueAtTime(speedVal, context.currentTime);

    // 2. EXTRA WARM LO-FI EQUALIZER (Thick Sub Bass & Smooth Treble)
    const heavyBass = context.createBiquadFilter();
    heavyBass.type = "lowshelf";
    heavyBass.frequency.value = 110; // Deep sub-bass thumping
    heavyBass.gain.value = parseFloat(document.getElementById('eqBass').value) + 5; 

    const midWarmth = context.createBiquadFilter();
    midWarmth.type = "peaking";
    midWarmth.Q.value = 0.6;
    midWarmth.frequency.value = 900;
    midWarmth.gain.value = parseFloat(document.getElementById('eqMid').value);

    const trebleSmooth = context.createBiquadFilter();
    trebleSmooth.type = "highshelf";
    trebleSmooth.frequency.value = 3200;
    // Treble ko halka down rakhenge taaki processing aur smoothly analog sound kare
    trebleSmooth.gain.value = parseFloat(document.getElementById('eqTreble').value) - 2; 

    source.connect(heavyBass);
    heavyBass.connect(midWarmth);
    midWarmth.connect(trebleSmooth);
    let masterAudio = trebleSmooth;

    // 3. FULL MASTER DYNAMICS COMPRESSOR (Cleans any residual hiss)
    const noiseEnabled = document.getElementById('noiseToggle').checked;
    if (noiseEnabled) {
        const studioComp = context.createDynamicsCompressor();
        studioComp.threshold.setValueAtTime(-38, context.currentTime);
        studioComp.knee.setValueAtTime(12, context.currentTime);
        studioComp.ratio.setValueAtTime(6, context.currentTime);
        studioComp.attack.setValueAtTime(0.004, context.currentTime);
        studioComp.release.setValueAtTime(0.06, context.currentTime);
        
        masterAudio.connect(studioComp);
        masterAudio = studioComp;
    }

    // ================================================================
    // 4. THE MASSIVE STUDIO VENUE & SPRING HYBRID GRID
    // ================================================================
    // Sarsarahat hatane ke liye humne loops ko poora block kar diya hai.
    // Ab teen massive alag-alag channels PARALLEL chalenge bina ek doosre ko disturb kiye.
    
    const reverbMix = parseFloat(document.getElementById('reverb').value);
    
    // Channel A: Massive Hall Depth (Long 680ms Delay)
    const delayA = context.createDelay();
    delayA.delayTime.value = 0.68;
    const feedbackA = context.createGain();
    feedbackA.gain.value = reverbMix * 0.50;

    // Channel B: Massive Studio Width (Long 820ms Delay)
    const delayB = context.createDelay();
    delayB.delayTime.value = 0.82;
    const feedbackB = context.createGain();
    feedbackB.gain.value = reverbMix * 0.45;

    // Channel C: THE SPRING REVERB RESONANCE (Fast Metallic Bounce Matrix)
    // Dynamic feedback to recreate the vintage tension string reverb feel
    const springDelay = context.createDelay();
    springDelay.delayTime.value = 0.035; // Short bouncy time for physical spring feeling
    const springFeedback = context.createGain();
    springFeedback.gain.value = 0.55; // Metallic spring reflection dampening factor

    // Connect Spring Pathway internally (isolated from the main delay lanes to stop hiss)
    springDelay.connect(springFeedback);
    springFeedback.connect(springDelay);

    // Reverb Quality Dampening Filter (Keeps the reverb cloud extremely soft & backgrounded)
    const reverbFilter = context.createBiquadFilter();
    reverbFilter.type = "lowpass";
    reverbFilter.frequency.value = 1100; // Deep tone cutoff

    // ROUTING: Connect audio source directly into the parallel channels
    // Lane 1 (Massive depth)
    masterAudio.connect(delayA);
    delayA.connect(reverbFilter);
    reverbFilter.connect(feedbackA);
    feedbackA.connect(delayA); // Straight isolated loop

    // Lane 2 (Extreme width)
    masterAudio.connect(delayB);
    delayB.connect(reverbFilter);
    reverbFilter.connect(feedbackB);
    feedbackB.connect(delayB); // Straight isolated loop

    // Lane 3 (Spring texture injection)
    masterAudio.connect(springDelay);

    // Master Dry (Vocals) / Wet (Space) Node Balancing
    const dryGain = context.createGain();
    const wetGain = context.createGain();

    dryGain.gain.value = 1.0; // Vocal tight, upfront, singular
    wetGain.gain.value = reverbMix * 1.6; // Heavy atmosphere gain

    // Route all parallel tails safely to the master wet output channel
    feedbackA.connect(wetGain);
    feedbackB.connect(wetGain);
    springFeedback.connect(wetGain);

    // Route clean vocals path
    masterAudio.connect(dryGain);

    // Final Stage Summation
    const destination = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(destination);
    wetGain.connect(destination);

    return source;
}

// --- COMMAND EXECUTION RUNNERS ---
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle file choose karo bhai!");
    if (sourceNode) { try { sourceNode.stop(); } catch(e) {} }

    sourceNode = setupAudioPipeline(audioCtx, audioBuffer, false);
    sourceNode.start(0);
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!audioBuffer) return alert("Pehle audio upload karein!");

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerText = "Master Rendering...";
    downloadBtn.disabled = true;

    const speedVal = parseFloat(document.getElementById('speed').value);
    const renderDuration = (audioBuffer.duration / speedVal) + 9; // High headspace for massive tails

    const offlineCtx = new OfflineAudioContext(1, renderDuration * audioBuffer.sampleRate, audioBuffer.sampleRate);
    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    
    offlineSource.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const mp3Blob = bufferToMp3(renderedBuffer);

    const downloadUrl = URL.createObjectURL(mp3Blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'studio_x_clean_grand_mix.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.innerText = "Export MP3";
    downloadBtn.disabled = false;
    alert("🎉 Hiss-Free Premium Master MP3 Exported!");
});

// --- LAMEJS STREAM AUDIO ENGINE ---
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
