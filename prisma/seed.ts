/* eslint-disable no-console */
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { ObjectId } from 'mongodb'

const prisma = new PrismaClient()

// ---------- Scale knobs ----------
const NUM_USERS = 120
const FOLLOW_EDGES = 350
const WATCHLISTS = 800
const LIKES = 900
const RATINGS = 900
const REVIEWS = 650
const REVIEW_COMMENTS = 1300
const BLOGS = 120
const BLOG_COMMENTS = 450
const ENTITY_REACTIONS = 1200

// Max movies to keep in memory for random picks (protects RAM if you have huge TMDB imports)
const MOVIE_POOL_LIMIT = 5000
// ---------------------------------

const oid = () => new ObjectId().toString()
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
const nrand = (n: number) => Array.from({ length: n })
const uniquePairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`)

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
  'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
] as const

type LocalReviewComment = { id: string; reviewId: string } // minimal fields we reuse

async function loadMoviePool() {
  const total = await prisma.movie.count()
  if (total === 0) {
    throw new Error('⚠️ No movies found in DB. Seed your TMDB movies first!')
  }

  // If there are fewer than MOVIE_POOL_LIMIT, just load all ids.
  if (total <= MOVIE_POOL_LIMIT) {
    const all = await prisma.movie.findMany({ select: { id: true, tmdbId: true, title: true } })
    console.log(`Movies fetched from DB: ${all.length}`)
    return all
  }

  // Otherwise, grab a capped pool using stable windows (first, middle, last chunks)
  const chunk = Math.floor(MOVIE_POOL_LIMIT / 3)
  const first = await prisma.movie.findMany({ take: chunk, select: { id: true, tmdbId: true, title: true } })
  const middleSkip = Math.max(0, Math.floor(total / 2) - Math.floor(chunk / 2))
  const mid = await prisma.movie.findMany({ skip: middleSkip, take: chunk, select: { id: true, tmdbId: true, title: true } })
  const lastSkip = Math.max(0, total - chunk)
  const last = await prisma.movie.findMany({ skip: lastSkip, take: chunk, select: { id: true, tmdbId: true, title: true } })
  const pool = [...first, ...mid, ...last]
  console.log(`Movies fetched (pooled): ${pool.length} of ~${total} total`)
  return pool
}

async function main() {
  console.time('seed')

  // 0) Ensure we have a movie pool (from your TMDB import)
  const movies = await loadMoviePool()

  // 1) USERS
  const usedEmails = new Set<string>()
  const users = await Promise.all(
    nrand(NUM_USERS).map(async () => {
      let email = faker.internet.email({ provider: 'example.com' }).toLowerCase()
      while (usedEmails.has(email)) {
        email = faker.internet.email({ provider: 'example.com' }).toLowerCase()
      }
      usedEmails.add(email)

      const id = oid()
      const name = faker.person.fullName()
      const username = faker.internet.username().slice(0, 20)
      const image = faker.image.avatarGitHub()
      const avatarUrl = image
      const movieGenres = faker.helpers.arrayElements(GENRES, { min: 2, max: 5 })

      return prisma.user.create({
        data: {
          id,
          name,
          username,
          email,
          password: null,
          bio: faker.lorem.sentence(),
          image,
          avatarUrl,
          emailVerified: null,
          movieGenres: [...movieGenres],
          createdAt: faker.date.past(),
          updatedAt: new Date()
        }
      })
    })
  )
  console.log(`Users: ${users.length}`)

  // 2) FOLLOWS
  const followSet = new Set<string>()
  let followsCreated = 0
  for (const _ of nrand(FOLLOW_EDGES)) {
    const a = pick(users)
    const b = pick(users)
    if (!a || !b || a.id === b.id) continue
    const key = uniquePairKey(a.id, b.id)
    if (followSet.has(key)) continue
    try {
      await prisma.follow.create({
        data: {
          id: oid(),
          followerId: a.id,
          followingId: b.id,
          createdAt: faker.date.recent()
        }
      })
      followSet.add(key)
      followsCreated++
    } catch {
      // ignore unique race
    }
  }
  console.log(`Follows: ${followsCreated}`)

  // 3) WATCHLISTS
  let watchlistsCreated = 0
  const wlPairs = new Set<string>()
  for (const _ of nrand(WATCHLISTS)) {
    const u = pick(users); const m = pick(movies)
    if (!u || !m) continue
    const key = `${u.id}:${m.id}`
    if (wlPairs.has(key)) continue
    try {
      await prisma.watchlist.create({
        data: { id: oid(), userId: u.id, movieId: m.id, addedAt: faker.date.recent() }
      })
      wlPairs.add(key)
      watchlistsCreated++
    } catch { /* ignore */ }
  }
  console.log(`Watchlists: ${watchlistsCreated}`)

  // 4) MOVIE LIKES
  let likesCreated = 0
  const likePairs = new Set<string>()
  for (const _ of nrand(LIKES)) {
    const u = pick(users); const m = pick(movies)
    if (!u || !m) continue
    const key = `${u.id}:${m.id}`
    if (likePairs.has(key)) continue
    try {
      await prisma.liked.create({
        data: { id: oid(), userId: u.id, movieId: m.id, addedAt: faker.date.recent() }
      })
      likePairs.add(key)
      likesCreated++
    } catch { /* ignore */ }
  }
  console.log(`Movie Likes: ${likesCreated}`)

  // 5) RATINGS
  let ratingsCreated = 0
  const ratingPairs = new Set<string>()
  for (const _ of nrand(RATINGS)) {
    const u = pick(users); const m = pick(movies)
    if (!u || !m) continue
    const key = `${u.id}:${m.id}`
    if (ratingPairs.has(key)) continue
    try {
      await prisma.rating.create({
        data: {
          id: oid(),
          value: Number((faker.number.float({ min: 0.5, max: 5, multipleOf: 0.5 })).toFixed(1)),
          userId: u.id,
          movieId: m.id,
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      })
      ratingPairs.add(key)
      ratingsCreated++
    } catch { /* unique violations ok */ }
  }
  console.log(`Ratings: ${ratingsCreated}`)

  // 6) REVIEWS
  const createdReviews = []
  for (const _ of nrand(REVIEWS)) {
    const u = pick(users); const m = pick(movies)
    if (!u || !m) continue
    try {
      const rev = await prisma.review.create({
        data: {
          id: oid(),
          content: faker.lorem.paragraphs({ min: 1, max: 3 }, '\n\n'),
          userId: u.id,
          movieId: m.id,
          createdAt: faker.date.past(),
          updatedAt: new Date(),
          likes: faker.number.int({ min: 0, max: 40 }),
          fire: faker.number.int({ min: 0, max: 25 }),
          popularity: faker.number.int({ min: 0, max: 100 })
        }
      })
      createdReviews.push(rev)
    } catch { /* ignore unique userId+movieId */ }
  }
  console.log(`Reviews: ${createdReviews.length}`)

  // 7) REVIEW COMMENTS (typed)
  const comments: LocalReviewComment[] = []
  for (const _ of nrand(REVIEW_COMMENTS)) {
    const r = pick(createdReviews); const u = pick(users)
    if (!r || !u) continue

    let parentId: string | null = null
    if (comments.length > 0 && Math.random() < 0.2) {
      const sameReviewComments = comments.filter(c => c.reviewId === r.id)
      if (sameReviewComments.length) parentId = pick(sameReviewComments).id
    }

    const c = await prisma.reviewComment.create({
      data: {
        id: oid(),
        comment: faker.lorem.sentences({ min: 1, max: 3 }),
        userId: u.id,
        reviewId: r.id,
        parentId,
        createdAt: faker.date.recent(),
        updatedAt: new Date()
      },
      select: { id: true, reviewId: true }
    })

    comments.push(c)
  }
  console.log(`Review comments: ${comments.length}`)

  // 8) BLOGS
  const blogs = []
  for (const _ of nrand(BLOGS)) {
    const u = pick(users)!
    const b = await prisma.blog.create({
      data: {
        id: oid(),
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        content: faker.lorem.paragraphs({ min: 2, max: 6 }, '\n\n'),
        hashtags: faker.helpers.arrayElement(['#cinephile', '#behindthescenes', '#review', '#oscars', '#trending']) ?? null,
        blogNumber: faker.number.int({ min: 1, max: 100000 }),
        createdAt: faker.date.past(),
        updatedAt: new Date(),
        tags: faker.helpers.arrayElements(['Review', 'Art', 'Drama', 'Tech', 'OTT', 'BoxOffice'], { min: 1, max: 3 }),
        thumbnail: Math.random() < 0.7 ? faker.image.urlPicsumPhotos() : null,
        likes: faker.number.int({ min: 0, max: 250 }),
        fire: faker.number.int({ min: 0, max: 120 }),
        views: faker.number.int({ min: 0, max: 5000 }),
        userEmail: u.email
      }
    })
    blogs.push(b)
  }
  console.log(`Blogs: ${blogs.length}`)

  // 9) BLOG COMMENTS (+ tagged users)
  let blogCommentsCreated = 0
  for (const _ of nrand(BLOG_COMMENTS)) {
    const b = pick(blogs); const u = pick(users)
    if (!b || !u) continue

    const tagCount = faker.number.int({ min: 0, max: 2 })
    const tagged = faker.helpers.arrayElements(users, { min: 0, max: tagCount }).map(t => t.id)

    await prisma.blogComment.create({
      data: {
        id: oid(),
        content: faker.lorem.sentences({ min: 1, max: 3 }),
        userId: u.id,
        blogId: b.id,
        createdAt: faker.date.recent(),
        updatedAt: new Date(),
        taggedUsers: tagged
      }
    })
    blogCommentsCreated++
  }
  console.log(`Blog comments: ${blogCommentsCreated}`)

  // 10) ENTITY REACTIONS (review/blog, likes/fire)
  const reactionTargets = [
    ...createdReviews.map(r => ({ entityId: r.id, entityType: 'review' as const })),
    ...blogs.map(b => ({ entityId: b.id, entityType: 'blog' as const }))
  ]
  const reactionKinds = ['likes', 'fire'] as const

  let reactionsCreated = 0
  const reactionSet = new Set<string>()
  for (const _ of nrand(ENTITY_REACTIONS)) {
    const target = pick(reactionTargets)
    const u = pick(users)
    if (!target || !u) continue

    const reactionType = pick(reactionKinds)
    const key = `${u.id}:${target.entityId}:${target.entityType}:${reactionType}`
    if (reactionSet.has(key)) continue

    try {
      await prisma.entityReaction.create({
        data: {
          id: oid(),
          userId: u.id,
          entityId: target.entityId,
          entityType: target.entityType,
          reactionType,
          createdAt: faker.date.recent()
        }
      })
      reactionSet.add(key)
      reactionsCreated++
    } catch (e) {
      // likely unique clash races — ignore but log lightly if you want:
      // console.log('Entity reaction error', e)
    }
  }
  console.log(`Entity reactions: ${reactionsCreated}`)

  console.timeEnd('seed')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
