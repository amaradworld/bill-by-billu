const express = require('express');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');
const { processArticles } = require('../services/blogBot');

const router = express.Router();

const PLATFORM_OWNER = (process.env.PLATFORM_OWNER_EMAIL || 'amaradworld@gmail.com').toLowerCase();

// Only the platform owner may manage blog content
async function requirePlatformOwner(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== PLATFORM_OWNER) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    logger.error({ err }, 'Blog admin check failed');
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Public: list published posts ───
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const where = { status: 'published' };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true, title: true, slug: true, content: true, excerpt: true,
          category: true, sourceUrl: true, publishedAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Blog list failed');
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ─── Public: single post by slug ───
router.get('/:slug', async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug, status: 'published' },
      select: {
        id: true, title: true, slug: true, content: true, excerpt: true,
        category: true, sourceUrl: true, publishedAt: true,
      },
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    logger.error({ err }, 'Blog fetch failed');
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// ─── Admin: trigger bot manually ───
router.post('/sync', authenticate, requirePlatformOwner, async (req, res) => {
  try {
    const posted = await processArticles();
    res.json({ ok: true, posted });
  } catch (err) {
    logger.error({ err }, 'Blog sync failed');
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── Admin: list all posts (including drafts) ───
router.get('/admin/all', authenticate, requirePlatformOwner, async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, slug: true, excerpt: true, category: true,
        status: true, sourceUrl: true, publishedAt: true,
      },
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ─── Admin: delete post ───
router.delete('/:id', authenticate, requirePlatformOwner, async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
