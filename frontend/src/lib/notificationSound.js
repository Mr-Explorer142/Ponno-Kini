export function playNotificationSound() {
    if (typeof window.AudioContext === "undefined") return false;

    const context = new window.AudioContext();
    if (context.state === "suspended") void context.resume();

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
    oscillator.onended = () => void context.close();
    return true;
}
