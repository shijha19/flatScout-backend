// Middleware to check if user is authenticated
export const auth = (req, res, next) => {
  try {
    let user = req.body.user || req.query.user;
    if (!user && req.headers['user']) {
      try {
        user = JSON.parse(req.headers['user']);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid user header' });
      }
    }
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed.' });
  }
};
