import { useState, useRef, useCallback } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useVoiceInput({ onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(!!SpeechRecognition)
  const recognitionRef = useRef(null)

  const start = useCallback(() => {
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, isSupported, start, stop }
}
