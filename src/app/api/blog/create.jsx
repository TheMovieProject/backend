import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import nextConnect from 'next-connect';
import path from 'path';

const prisma = new PrismaClient();

// Setup multer for file upload handling
const upload = multer({
  storage: multer.diskStorage({
    destination: './public/uploads', // Ensure this directory exists
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  }),
});

const handler = nextConnect()
  .use(upload.single('thumbnail'))
  .post(async (req, res) => {
    const { title, hashtags, content } = req.body;
    const thumbnailPath = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const newPost = await prisma.blogPost.create({
        data: {
          title,
          hashtags,
          content,
          thumbnail: thumbnailPath, // Save thumbnail path
        },
      });
      res.status(201).json(newPost);
    } catch (error) {
      res.status(500).json({ error: 'Error creating post' });
    }
  });

export default handler;
