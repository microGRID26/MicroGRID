'use client'

import { HelpTopic } from './HelpTopic'
import type { HelpTopicData } from './topics/index'

interface HelpCategoryProps {
  category: string
  topics: HelpTopicData[]
  openTopics: Set<string>
  onToggle: (id: string) => void
  onRelatedClick?: (id: string) => void
  allTopics?: HelpTopicData[]
}

export function HelpCategory({ category, topics, openTopics, onToggle, onRelatedClick, allTopics }: HelpCategoryProps) {
  if (topics.length === 0) return null

  return (
    <div id={`cat-${category.toLowerCase().replace(/\s+/g, '-')}`} className="scroll-mt-24">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">{category}</h2>
      <div className="space-y-2">
        {topics.map(topic => (
          <HelpTopic
            key={topic.id}
            topic={topic}
            isOpen={openTopics.has(topic.id)}
            onToggle={() => onToggle(topic.id)}
            onRelatedClick={onRelatedClick}
            allTopics={allTopics}
          />
        ))}
      </div>
    </div>
  )
}
