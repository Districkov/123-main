const TOKEN = process.env.ADMIN_TOKEN || 'termokont-admin';

module.exports = function(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
