let audioContext;

async function getReadyAudioContext() {
    if (typeof window.AudioContext === "undefined") return null;

    try {
        audioContext ??= new window.AudioContext();
        if (audioContext.state !== "running") {
            await audioContext.resume();
        }
        return audioContext.state === "running" ? audioContext : null;
    } catch {
        return null;
    }
}

const unlockOnInteraction = () => {
    void getReadyAudioContext().then((context) => {
        if (context) {
            window.removeEventListener("pointerdown", unlockOnInteraction);
            window.removeEventListener("keydown", unlockOnInteraction);
        }
    });
};

if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", unlockOnInteraction);
    window.addEventListener("keydown", unlockOnInteraction);
}

export async function playNotificationSound() {
    const context = await getReadyAudioContext();
    if (!context) return false;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    volume.gain.setValueAtTime(0.08, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => {
        oscillator.disconnect();
        volume.disconnect();
    };
    return true;
}
