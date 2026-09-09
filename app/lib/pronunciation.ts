/** Provider boundary: replace this implementation when approved audio is configured. */
export function speakArabic(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { reject(new Error('Audio is not supported in this browser.')); return }
    const speech = new SpeechSynthesisUtterance(text)
    speech.lang = 'ar'
    const voice = window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith('ar'))
    if (voice) speech.voice = voice
    speech.rate = .85
    speech.onend = () => resolve()
    speech.onerror = () => reject(new Error('Arabic pronunciation is unavailable on this device.'))
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(speech)
  })
}
