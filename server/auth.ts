import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

if (process.env.JWT_SECRET === undefined) {
  console.warn('Warning: JWT_SECRET is not set in .env file. Using a default, insecure key.');
}

// Function to hash a password
export const hashPassword = (password: string) => {
  return bcrypt.hash(password, 10);
};

// Function to compare a password with its hash
export const comparePassword = (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

// Function to create a JWT
export const createJWT = (user: { id: number; username: string; email: string }) => {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '1d' } // Token expires in 1 day
  );
  return token;
};

// Middleware to protect routes
export const protect = (req: Request, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const [, token] = bearer.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; username: string; email: string };
    (req as any).user = payload; // Attach user payload to the request object
    next();
  } catch (e) {
    console.error('Token verification error:', e);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
