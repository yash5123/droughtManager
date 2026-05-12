import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;
  
  // Debug logging for troubleshooting session issues (Token content is NEVER logged)
  if (!token && req.header('Authorization')) {
    console.log('[Auth] Token missing from cookies, but found in Authorization header');
  } else if (!token) {
    console.log('[Auth] No token found in cookies or headers');
  }
  
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains the user id: { id: userId }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is invalid or expired' });
  }
};

export default authMiddleware;
