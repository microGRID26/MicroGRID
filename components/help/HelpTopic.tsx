'use client'

import { ChevronDown, ExternalLink } from 'lucide-react'
import type { HelpTopicData } from './topics/index'

interface HelpTopicProps {
  topic: HelpTopicData
  isOpen: boolean
  onToggle: () => void
  onRelatedClick?: (id: string) => void
  allTopics?: HelpTopicData[]
}

export function HelpTopic({ topic, isOpen, onToggle, onRelatedClick, allTopics }: HelpTopicProps) {
  const Content = topic.content

  return (
    <div id={topic.id} className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/50 transition-colors hover:border-gray-700">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">{topic.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{topic.description}</div>
        </div>
        {topic.tryItLink && (
          <span className="text-xs text-green-500 shrink-0 hidden sm:block">Try it</span>
        )}
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-800">
          <div className="pt-4 text-sm text-gray-400 leading-relaxed">
            <Content />
          </div>

          {/* Footer: Try it + Related */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            {topic.tryItLink && (
              <a
                href={topic.tryItLink}
                className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Try it now
              </a>
            )}
            {topic.relatedTopics && topic.relatedTopics.length > 0 && allTopics && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600">Related:</span>
                {topic.relatedTopics.map(rid => {
                  const related = allTopics.find(t => t.id === rid)
                  if (!related) return null
                  return (
                    <button
                      key={rid}
                      onClick={() => onRelatedClick?.(rid)}
                      className="text-xs text-gray-500 hover:text-green-400 underline underline-offset-2 transition-colors"
                    >
                      {related.title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
