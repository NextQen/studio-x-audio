let audioCtx;
let audioBuffer;
let sourceNode;

document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    alert("🔥 Song loaded! Studio Engine Ready.");
});

// --- EFFECTS PIPELINE SETUP FUNCTION ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. SLOWED EFFECT (Pitch & Speed Dono Drop Hogi)
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.value = speedVal;

    // 2. EQUALIZER (Bass Boost)
    const bassFilter = context.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 150; // Deep bass range
    bassFilter.gain.value = parseFloat(document.getElementById('bass').value);

    // 3. NOISE REDUCER / STUDIO LEVELER (Compressor)
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(parseFloat(document.getElementById('noise').value), context.currentTime);
    compressor.knee.setValueAtTime(30, context.currentTime);
    compressor.ratio.setValueAtTime(4, context.currentTime);
    compressor.attack.setValueAtTime(0.01, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    // 4. NEXT-LEVEL REVERB (Feedback Delay Loop for Aesthetic Vibe)
    const delay = context.createDelay();
    delay.delayTime.value = 0.4; // Sweet spot for slowed reverb

    const feedback = context.createGain();
    feedback.gain.value = parseFloat(document.getElementById('reverb').value) * 0.7; // Reverb tail control

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200; // Dampens the echo for a dreamy/lo-fi effect

    // Connect Reverb Loop
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);

    // Mix/Dry-Wet Control
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    
    dryGain.gain.value = 1.0;
    wetGain.gain.value = parseFloat(document.getElementById('reverb').value);

    // Connections
    source.connect(bassFilter);
    bassFilter.connect(compressor);

    // Split into Dry (Clean) and Wet (Reverb)
    compressor.connect(dryGain);
    compressor.connect(delay);
    delay.connect(wetGain);

    // Final Output Destination
    const output = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(output);
    wetGain.connect(output);

    return source;
}

// --- PLAY BUTTON ---
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle file upload karo bhai!");
    if (sourceNode) sourceNode.stop();

    sourceNode = setupAudioPipeline(audioCtx, audioBuffer, false);
    sourceNode.start(0);
});

// --- DOWNLOAD / EXPORT LOGIC ---
document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!audioBuffer) return alert("Download karne ke liye pehle file upload karo!");

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerText = "Processing & Rendering...";
    downloadBtn.disabled = true;

    // Output track length adjustment based on speed
    const speedVal = parseFloat(document.getElementById('speed').value);
    const renderLength = (audioBuffer.duration / speedVal) + 5; // +5 seconds for reverb tail

    // Create Offline Context for rendering
    const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        renderLength * audioBuffer.sampleRate,
        audioBuffer.sampleRate
    );

    // Setup the exact same pipeline in offline mode
    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    offlineSource.start(0);

    // Render Audio
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert Rendered Audio Buffer to WAV format
    const wavBlob = bufferToWav(renderedBuffer);
    
    // Create Download Link
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studio_x_slowed_reverb.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    downloadBtn.innerText = "Export / Download";
    downloadBtn.disabled = false;
    alert("🎉 Song downloaded successfully!");
});

// --- HELPER FUNCTION: AUDIO BUFFER TO WAV CONVERTER ---
function bufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length),
        view = new DataView(bufferArr),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16);         // length of = 16
    setUint16(1);          // PCM format = 1
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2);                     // block align
    setUint16(16);                                // bits per sample
    setUint32(0x61746164);                        // "data" chunk
    setUint32(length - pos - 4);                  // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([bufferArr], { type: 'audio/wav' });
}
