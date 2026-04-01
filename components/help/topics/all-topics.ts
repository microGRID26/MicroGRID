import { gettingStartedTopics } from './getting-started'
import { dailyWorkflowTopics } from './daily-workflow'
import { projectManagementTopics } from './project-management'
import { notesCommunicationTopics } from './notes-communication'
import { financialTopics } from './financial'
import { inventoryTopics } from './inventory'
import { scheduleTopics } from './schedule'
import { changeOrderTopics } from './change-orders'
import { analyticsTopics } from './analytics'
import { administrationTopics } from './administration'
import { systemFeaturesTopics } from './system-features'
import { designToolsTopics } from './design-tools'
import { ticketingTopics } from './ticketing'
import type { HelpTopicData } from './index'

export const ALL_TOPICS: HelpTopicData[] = [
  ...gettingStartedTopics,
  ...dailyWorkflowTopics,
  ...projectManagementTopics,
  ...notesCommunicationTopics,
  ...financialTopics,
  ...inventoryTopics,
  ...scheduleTopics,
  ...changeOrderTopics,
  ...analyticsTopics,
  ...administrationTopics,
  ...systemFeaturesTopics,
  ...designToolsTopics,
  ...ticketingTopics,
]
