import type { Comment } from '../types'
import { users } from './users'

const byUsername = (username: string) => {
  const user = users.find((item) => item.username === username)
  if (!user) throw new Error(`Unknown user: ${username}`)
  return user
}

export const comments: Comment[] = [
  {
    id: 'comment_01',
    postId: 'post_01',
    author: byUsername('maya-chen'),
    content:
      'The point about defaults is the one I keep coming back to. Most products are honest only in their settings page.',
    createdAt: '2026-10-18T09:02:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_02',
    postId: 'post_01',
    author: byUsername('sofia-reed'),
    content:
      'Slow tech is also a travel problem. The best maps are the ones that do not try to show you everything at once.',
    createdAt: '2026-10-18T11:35:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_03',
    postId: 'post_01',
    author: byUsername('demo'),
    content:
      'I turned off every notification except messages for a week. The surprising part was how little I missed.',
    createdAt: '2026-10-19T07:20:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_04',
    postId: 'post_02',
    author: byUsername('nina-kovacs'),
    content:
      '“A hundred small decisions” is exactly right. Trust is built in the error states, not the marketing page.',
    createdAt: '2026-10-16T12:10:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_05',
    postId: 'post_02',
    author: byUsername('leo-martin'),
    content:
      'The checklist at the end is going straight into our design review template. Thanks Maya.',
    createdAt: '2026-10-17T08:45:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_06',
    postId: 'post_03',
    author: byUsername('arjun-patel'),
    content:
      'We took the ferry instead of the tunnel and it was the best decision of the trip. Bring a windproof layer.',
    createdAt: '2026-10-14T10:00:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_07',
    postId: 'post_03',
    author: byUsername('maya-chen'),
    content:
      'That second photo is unreal. Saving this itinerary for next spring.',
    createdAt: '2026-10-15T13:22:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_08',
    postId: 'post_04',
    author: byUsername('nina-kovacs'),
    content:
      'The ten minutes around the cup — yes. I have started leaving my phone in the other room and it changes the whole morning.',
    createdAt: '2026-10-12T09:12:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_09',
    postId: 'post_12',
    author: byUsername('demo'),
    content:
      'The adapter pattern is the part people skip. It is also the part that makes the second year bearable.',
    createdAt: '2026-09-27T06:40:00.000Z',
    parentId: null,
  },
  {
    id: 'comment_10',
    postId: 'post_12',
    author: byUsername('maya-chen'),
    content:
      'Would love a follow-up on how you handle loading and error states in the composables.',
    createdAt: '2026-09-27T15:05:00.000Z',
    parentId: null,
  },
]
