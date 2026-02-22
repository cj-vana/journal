'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lightbulb, RefreshCw } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface WritingPromptProps {
  prompts: string[]
}

export default function WritingPrompt({ prompts }: WritingPromptProps) {
  const [index, setIndex] = useState(0)

  if (prompts.length === 0) return null

  const currentPrompt = prompts[index % prompts.length]

  return (
    <Card className="bg-lavender-50 border-lavender-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-lavender-200 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-lavender-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-lavender-600 mb-1">Writing Prompt</p>
          <p className="text-warm-800 font-accent text-xl">{currentPrompt}</p>
          <div className="flex items-center gap-2 mt-3">
            <Link href={`/entries/new?prompt=${encodeURIComponent(currentPrompt)}`}>
              <Button size="sm">Write about this</Button>
            </Link>
            {prompts.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => i + 1)}
                className="gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Another
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
