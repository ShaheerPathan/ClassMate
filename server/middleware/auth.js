import { getToken } from "next-auth/jwt";

export const authMiddleware = async (req, res, next) => {
    try {
        // Check for Authorization header first
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header required' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token not provided' });
        }

        // Verify the token
        const decoded = await getToken({ 
            req,
            secret: process.env.NEXTAUTH_SECRET
        });

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Verify user ID matches (optional but recommended)
        if (req.body.userId && req.body.userId !== decoded.id) {
            return res.status(403).json({ error: 'User ID mismatch' });
        }

        // Add user info to request
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export default authMiddleware; 