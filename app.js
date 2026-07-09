let audioCtx;
let audioBuffer;
let sourceNode;

document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    alert("🔥 Premium Studio Engine Loaded!");
});

// --- PREMIUM AUDIO PIPELINE ---
function setupAudioPipeline(context, buffer, isExporting = false) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // 1. PITCH & SPEED DROP (Slowed Core)
    const speedVal = parseFloat(document.getElementById('speed').value);
    source.playbackRate.value = speedVal;

    // 2. DEEP BASS BOOST (Equalizer)
    const bassFilter = context.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 120; // Lowered frequency for deep sub-bass
    bassFilter.gain.value = parseFloat(document.getElementById('bass').value);

    // 3. NOISE REDUCER & STUDIO LEVELER
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(parseFloat(document.getElementById('noise').value), context.currentTime);
    compressor.knee.setValueAtTime(25, context.currentTime);
    compressor.ratio.setValueAtTime(6, context.currentTime);
    compressor.attack.setValueAtTime(0.005, context.currentTime);
    compressor.release.setValueAtTime(0.08, context.currentTime);

    // 4. LARGE STUDIO / CATHEDRAL REVERB
    // Dynamic delay mapping to mimic massive room size
    const delay = context.createDelay();
    delay.delayTime.value = 0.55; // Longer delay time for grand venue feel

    const feedback = context.createGain();
    // High feedback creates the huge long tail of a concert hall
    feedback.gain.value = parseFloat(document.getElementById('reverb').value) * 0.75; 

    const roomFilter = context.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 900; // Removes harsh metallic treble, gives a warm dreamy depth

    // Reverb loop feedback chain
    delay.connect(roomFilter);
    roomFilter.connect(feedback);
    feedback.connect(delay);

    // Dry/Wet Mix Controls
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    
    dryGain.gain.value = 0.95; // Slight reduction to blend with reverb better
    wetGain.gain.value = parseFloat(document.getElementById('reverb').value) * 0.8;

    // Pipeline Connections
    source.connect(bassFilter);
    bassFilter.connect(compressor);

    // Split signals
    compressor.connect(dryGain);
    compressor.connect(delay);
    delay.connect(wetGain);

    // Final Routing
    const output = isExporting ? context.destination : audioCtx.destination;
    dryGain.connect(output);
    wetGain.connect(output);

    return source;
}

// --- PLAY PREVIEW ---
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle file upload karo!");
    if (sourceNode) sourceNode.stop();

    sourceNode = setupAudioPipeline(audioCtx, audioBuffer, false);
    sourceNode.start(0);
});

// --- DOWNLOAD AS MP3 LOGIC ---
document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!audioBuffer) return alert("Download ke liye file select karein!");

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerText = "Encoding MP3...";
    downloadBtn.disabled = true;

    const speedVal = parseFloat(document.getElementById('speed').value);
    const renderLength = (audioBuffer.duration / speedVal) + 6; // Add 6s for reverb tail decay

    // Mono encoding for maximum compression speed & compatibility (Stereo can be added later)
    const offlineCtx = new OfflineAudioContext(
        1, 
        renderLength * audioBuffer.sampleRate,
        audioBuffer.sampleRate
    );

    const offlineSource = setupAudioPipeline(offlineCtx, audioBuffer, true);
    offlineSource.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert Buffer to MP3 using lamejs
    const mp3Blob = bufferToMp3(renderedBuffer);

    // Download Trigger
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studio_x_slowed_reverb.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    downloadBtn.innerText = "Export MP3";
    downloadBtn.disabled = false;
    alert("🎉 Studio Quality MP3 Downloaded!");
});

// --- HELPER FUNCTION: MP3 ENCODER ---
function bufferToMp3(buffer) {
    const channelData = buffer.getChannelData(0); // Get raw audio channel
    const sampleRate = buffer.sampleRate;
    
    // Create LameJS encoder instance (128kbps is perfect for standard web streaming and fast rendering)
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Data = [];

    // Convert Float32 audio samples to Int16 for MP3 encoder
    const samples = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const sampleBlockSize = 1152; // Lame standard block size
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(new Uint8Array(mp3buf));
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
}
