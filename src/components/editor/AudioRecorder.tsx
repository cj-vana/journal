'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { Mic, Square, Play, Pause, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface AudioRecorderProps {
  onUploadComplete: (media: { id: string; url: string }) => void
  onCancel: () => void
}

export default function AudioRecorder({ onUploadComplete, onCancel }: AudioRecorderProps) {
  const { isRecording, audioBlob, duration, error, startRecording, stopRecording } =
    useAudioRecorder()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup Object URL and audio element on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current.src = ''
      }
    }
  }, [])

  const togglePlayback = useCallback(() => {
    if (!audioBlob) return

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause()
        setIsPlaying(false)
      } else {
        audioElement.play()
        setIsPlaying(true)
      }
      return
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    const url = URL.createObjectURL(audioBlob)
    objectUrlRef.current = url
    const audio = new Audio(url)
    audio.onended = () => setIsPlaying(false)
    setAudioElement(audio)
    audioElementRef.current = audio
    audio.play()
    setIsPlaying(true)
  }, [audioBlob, audioElement, isPlaying])

  const handleConfirm = useCallback(async () => {
    if (!audioBlob) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const res = await fetch('/api/upload/audio', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      onUploadComplete(data)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [audioBlob, onUploadComplete])

  return (
    <div className="bg-warm-50 border border-warm-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        {!audioBlob && !isRecording && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-accent-400 text-white rounded-xl hover:bg-accent-600 transition-colors"
          >
            <Mic size={18} />
            <span>Start Recording</span>
          </button>
        )}

        {isRecording && (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-warm-800 font-medium" aria-live="polite">{formatDuration(duration)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-warm-600 text-white rounded-xl hover:bg-warm-800 transition-colors"
            >
              <Square size={16} />
              <span>Stop</span>
            </button>
          </>
        )}

        {audioBlob && !isRecording && (
          <>
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
              className="p-2 bg-white border border-warm-200 rounded-xl hover:bg-warm-100 transition-colors"
            >
              {isPlaying ? (
                <Pause size={18} className="text-warm-800" />
              ) : (
                <Play size={18} className="text-warm-800" />
              )}
            </button>
            <span className="text-warm-600 text-sm">{formatDuration(duration)}</span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isUploading}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm transition-colors',
                  'bg-sage-400 text-white hover:bg-sage-600',
                  isUploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-600 hover:bg-warm-100 transition-colors"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </>
        )}
      </div>

      {(error || uploadError) && (
        <p className="text-red-500 text-sm">{uploadError || error}</p>
      )}
    </div>
  )
}
