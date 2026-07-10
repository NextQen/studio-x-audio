let audioCtx;
let audioBuffer;
let sourceNode;

// File Upload Handler
document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    
    // Decode data into system audio buffer
    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
        audioBuffer = buffer;
        alert("🔥 Studio Engine Locked & Loaded!");
    }, (err) => {
        alert("Audio decode fail ho gaya bhai. Valid MP3/WAV check karo.");
    });
});

// --- AUDIO PROCESSING CORE ENGINE ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. TEMPO CHANGER LAYER (Slowed Drop - Pitch Drop Auto-binds)
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.setValueAtTime(speedVal, context.currentTime);

    // 2. STUDIO GRAPHIC EQUALIZER BANDS
    const bassEQ = context.createBiquadFilter();
    bassEQ.type = "lowshelf";
    bassEQ.frequency.value = 150;
    bassEQ.gain.value = parseFloat(document.getElementById('eqBass').value);

    const midEQ = context.createBiquadFilter();
    midEQ.type = "peaking";
    midEQ.Q.value = 1.0;
    midEQ.frequency.value = 1000;
    midEQ.gain.value = parseFloat(document.getElementById('eqMid').value);

    const trebleEQ = context.createBiquadFilter();
    trebleEQ.type = "highshelf";
    trebleEQ.frequency.value = 4000;
    trebleEQ.gain.value = parseFloat(document.getElementById('eqTreble').value);

    // Connect EQ Chain Series
    source.connect(bassEQ);
    bassEQ.connect(midEQ);
    midEQ.connect(trebleEQ);

    // 3. AUTOMATIC NOISE REDUCER GATE (Audioalter Architecture Specs)
    let lastNode = trebleEQ;
    const noiseEnabled = document.getElementById('noiseToggle').checked;
    
    if (noiseEnabled) {
        const noiseGate = context.createDynamicsCompressor();
        // Constant automatic threshold parameters to damp static line hums without user inputs
        noiseGate.threshold.setValueAtTime(-45, context.currentTime);
        noiseGate.knee.setValueAtTime(24, context.currentTime);
        noiseGate.ratio.setValueAtTime(5, context.currentTime);
        noiseGate.attack.setValueAtTime(0.008, context.currentTime);
        noiseGate.release.setValueAtTime(0.1, context.currentTime);
        
        lastNode.connect(noiseGate);
        lastNode = noiseGate;
    }

    // 4. LARGE STUDIO CONCERT HALL REVERB
    const delayNode = context.createDelay();
    delayNode.delayTime.value = 0.55; 

    const feedbackNode = context.createGain();
    feedbackNode.gain.value = parseFloat(document.getElementById('reverb').value) * 0.72; 

    // HF Damping Filter (Audioalter Spec: 50% cutoff filtering to stop metallic spring artifact)
    const dampingFilter = context.createBiquadFilter();
    dampingFilter.type = "lowpass";
    dampingFilter.frequency.value = 950; 

    // Reverb loop system mapping
    delayNode.connect(dampingFilter);
    dampingFilter.connect(feedbackNode);
    feedbackNode.connect(delayNode);

    // Parallel Dry/Wet Splitting System
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    
    dryGain.gain.value = 0.90; 
    wetGain.gain.value = parseFloat(document.getElementById('reverb').value) * 0.90; 

    lastNode.connect(dryGain);
    lastNode.connect(delayNode);
    delayNode.connect(wetGain);

    // Route out to target context terminal
    const outputTerminal = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(outputTerminal);
    wetGain.connect(outputTerminal);

    return source;
}

// --- CONTROLLERS RUNNERS ---

// Play/Preview Trigger
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle file upload karo bhai!");
    
    if (sourceNode) {
        try { sourceNode.stop(); } catch(e) {}
    }

    sourceNode = setupAudioPipeline(audioCtx, audioBuffer, false);
    sourceNode.start(0);
});

// Fast Render & Compressed MP3 Downloader
document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!audioBuffer) return alert("Download karne ke liye pehle file select karo!");

    const downloadBtn = document.getElementById('downloadBtn');
    const originalText = downloadBtn.innerText;
    downloadBtn.innerText = "Encoding MP3...";
    downloadBtn.disabled = true;

    const speedVal = parseFloat(document.getElementById('speed').value);
    // Dynamic buffer sizing depending on tracks length + reverb decay factor
    const renderDuration = (audioBuffer.duration / speedVal) + 6; 

    // Instantiate clean single-channel offline processor for rapid compression
    const offlineCtx = new OfflineAudioContext(1, renderDuration * audioBuffer.sampleRate, audioBuffer.sampleRate);
    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    
    offlineSource.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const mp3Blob = bufferToMp3(renderedBuffer);

    // Clean DOM Trigger
    const downloadUrl = URL.createObjectURL(mp3Blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'studio_x_processed_mix.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.innerText = originalText;
    downloadBtn.disabled = false;
});

// --- HELPER FUNCTION: RAW WAVE FLOAT DATA TO MP3 COMPRESSOR ---
function bufferToMp3(buffer) {
    const rawAudioChannel = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Encodes mono stream straight to constant bit rate 128kbps standard compression
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3DataChunks = [];

    // Map float array vectors (-1.0 to 1.0) directly into signed 16-bit PCM arrays
    const pcmSamples = new Int16Array(rawAudioChannel.length);
    for (let i = 0; i < rawAudioChannel.length; i++) {
        let sample = Math.max(-1, Math.min(1, rawAudioChannel[i]));
        pcmSamples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    const blockSize = 1152; 
    for (let i = 0; i < pcmSamples.length; i += blockSize) {
        const sampleChunk = pcmSamples.subarray(i, i + blockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3DataChunks.push(new Uint8Array(mp3buf));
        }
    }

    const flushedBuf = mp3encoder.flush();
    if (flushedBuf.length > 0) {
        mp3DataChunks.push(new Uint8Array(flushedBuf));
    }

    return new Blob(mp3DataChunks, { type: 'audio/mp3' });
}
