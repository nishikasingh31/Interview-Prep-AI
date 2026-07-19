import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/authRoutes.js';
import interviewRoutes from './src/routes/interviewRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);

// Simple test route to confirm server works
app.get('/', (req, res) => {
  res.send('AI Interview Prep API is running');
});

export default app;