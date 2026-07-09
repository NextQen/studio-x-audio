let audioCtx;
let audioBuffer;
let sourceNode;

// Effects Nodes
let biquadFilter; // For Bass/EQ
let dynamicsCompressor; // For Studio Leveling/Noise Control
let delayNode; // For Reverb effect
let gainNode; // For Mix/Volume

document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Initialize Audio Context
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Decode audio data
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    alert("Song loaded and ready for Studio processing!");
});

document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBuffer) return alert("Pehle file upload karo bhai!");

    // Stop existing playback if any
    if (sourceNode) sourceNode.stop();

    // 1. Source Node
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    // 2. Slowed Control (Playback Rate)
    const speedVal = document.getElementById('speed').value;
    sourceNode.playbackRate.value = speedVal;

    // 3. EQ / Bass Boost Node
    biquadFilter = audioCtx.createBiquadFilter();
    biquadFilter.type = "lowshelf";
    biquadFilter.frequency.value = 200; // Bass frequencies
    biquadFilter.gain.value = document.getElementById('bass').value;

    // 4. Studio Leveler / Noise Gate (Compressor)
    dynamicsCompressor = audioCtx.createDynamicsCompressor();
    dynamicsCompressor.threshold.setValueAtTime(document.getElementById('noise').value, audioCtx.currentTime);
    dynamicsCompressor.knee.setValueAtTime(40, audioCtx.currentTime);
    dynamicsCompressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    dynamicsCompressor.attack.setValueAtTime(0, audioCtx.currentTime);
    dynamicsCompressor.release.setValueAtTime(0.25, audioCtx.currentTime);

    // 5. Reverb Simple Setup (Delay Node)
    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.3; // 300ms delay for echo/reverb feel
    gainNode = audioCtx.createGain();
    gainNode.gain.value = document.getElementById('reverb').value;

    // PIPELINE CONNECTIVITY (Ek sath sab jodna)
    // Source -> Filter(Bass) -> Compressor(Noise) -> Destination
    sourceNode.connect(biquadFilter);
    biquadFilter.connect(dynamicsCompressor);
    
    // Parallel chain for Reverb (Echo effect)
    dynamicsCompressor.connect(delayNode);
    delayNode.connect(gainNode);
    gainNode.connect(audioCtx.destination); // Reverb output
    
    dynamicsCompressor.connect(audioCtx.destination); // Clean output

    // Start Playback
    sourceNode.start(0);
});
