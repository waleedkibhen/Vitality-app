/**
 * useFeed.js — Refactored
 * Central state: videos, ratings, comments. Expiry timer removed per spec.
 */

import { useState, useCallback, useRef } from 'react'

const SEED_VIDEOS = [
  {
    id: 'v-001',
    title: 'POV: You dropped your phone at a concert',
    uploader: 'Alex M.',
    uploaderInitials: 'AM',
    postedAt: new Date(Date.now() - 2 * 60 * 1000),
    videoSrc: null,
    aspectRatio: '16/9',
    ratings: [8, 9, 7, 10, 8, 9],
    userRating: null,
    comments: [
      { id: 'c1', author: 'Jordan K.',  initials: 'JK', text: 'First 3 seconds have insane hook energy — this is going top 10.', ts: '1m' },
      { id: 'c2', author: 'Sam R.',     initials: 'SR', text: 'Audio sync needs a tweak but the concept is locked in.', ts: '4m' },
    ],
  },
  {
    id: 'v-002',
    title: 'Satisfying warehouse robot assembly — 60s',
    uploader: 'Priya S.',
    uploaderInitials: 'PS',
    postedAt: new Date(Date.now() - 48 * 60 * 1000),
    videoSrc: null,
    aspectRatio: '16/9',
    ratings: [6, 7, 5, 8],
    userRating: null,
    comments: [
      { id: 'c3', author: 'Casey L.', initials: 'CL', text: 'ASMR crowd will absolutely eat this.', ts: '30m' },
    ],
  },
  {
    id: 'v-003',
    title: '"Would you swap lives with an AI?" — Street interviews',
    uploader: 'DeShawn T.',
    uploaderInitials: 'DT',
    postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    videoSrc: null,
    aspectRatio: '9/16',
    ratings: [9, 10, 9, 8, 10, 9, 10],
    userRating: 9,
    comments: [
      { id: 'c4', author: 'Morgan B.', initials: 'MB', text: 'The last answer is UNHINGED. This blows up.', ts: '1h' },
      { id: 'c5', author: 'Nia F.',    initials: 'NF', text: 'Caption pacing is immaculate.', ts: '2h' },
      { id: 'c6', author: 'Tyler Q.',  initials: 'TQ', text: 'Shared to Discord immediately.', ts: '2h' },
      { id: 'c7', author: 'Jada P.',   initials: 'JP', text: 'Algorithm is going to go crazy on this one.', ts: '3h' },
    ],
  },
  {
    id: 'v-004',
    title: 'Cold plunge reaction compilation',
    uploader: 'Sofia C.',
    uploaderInitials: 'SC',
    postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    videoSrc: null,
    aspectRatio: '16/9',
    ratings: [4, 5, 6, 4, 5],
    userRating: null,
    comments: [],
  },
]

export function useFeed() {
  const [videos, setVideos] = useState(SEED_VIDEOS)
  const nextId = useRef(100)

  const rateVideo = useCallback((videoId, value) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v
        const ratings = v.userRating !== null
          ? [...v.ratings.slice(0, -1), value]
          : [...v.ratings, value]
        return { ...v, ratings, userRating: value }
      })
    )
  }, [])

  const addComment = useCallback((videoId, text) => {
    if (!text?.trim()) return
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v
        return {
          ...v,
          comments: [
            { id: `c-${Date.now()}`, author: 'You', initials: 'YU', text: text.trim(), ts: 'now' },
            ...v.comments,
          ],
        }
      })
    )
  }, [])

  const addVideo = useCallback((file, title, aspectRatio) => {
    const id  = `v-${nextId.current++}`
    const src = URL.createObjectURL(file)
    setVideos((prev) => [
      {
        id,
        title: title || file.name.replace(/\.[^.]+$/, ''),
        uploader: 'You',
        uploaderInitials: 'YU',
        postedAt: new Date(),
        videoSrc: src,
        aspectRatio: aspectRatio || '16/9',
        ratings: [],
        userRating: null,
        comments: [],
      },
      ...prev,
    ])
    return id
  }, [])

  return { videos, rateVideo, addComment, addVideo }
}
