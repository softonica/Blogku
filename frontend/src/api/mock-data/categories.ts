import type { Category } from '../types'

export const categories: Category[] = [
  {
    id: 'cat_technology',
    name: 'Technology',
    slug: 'technology',
    description:
      'Practical writing about the tools we build with and the decisions behind them.',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    parentId: null,
    postCount: 12,
  },
  {
    id: 'cat_design',
    name: 'Design',
    slug: 'design',
    description:
      'Interfaces, systems, typography and the craft of making things feel obvious.',
    image:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    parentId: null,
    postCount: 9,
  },
  {
    id: 'cat_travel',
    name: 'Travel',
    slug: 'travel',
    description:
      'Slow routes, small towns and field notes from places worth the detour.',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    parentId: null,
    postCount: 14,
  },
  {
    id: 'cat_food',
    name: 'Food',
    slug: 'food',
    description:
      'Recipes with a reason, honest reviews and the rituals around the table.',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    parentId: null,
    postCount: 8,
  },
  {
    id: 'cat_music',
    name: 'Music',
    slug: 'music',
    description:
      'Records, scenes and the people quietly shaping what we listen to next.',
    image:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    parentId: null,
    postCount: 11,
  },
  {
    id: 'cat_lifestyle',
    name: 'Lifestyle',
    slug: 'lifestyle',
    description:
      'Homes, habits and the ordinary systems that make a week feel lighter.',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    parentId: null,
    postCount: 15,
  },
]
