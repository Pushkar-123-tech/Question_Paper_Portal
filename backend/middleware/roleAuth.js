const roleAuth = (roles) => {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const User = require('../models/User');
    User.findById(req.userId).then(user => {
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
      }
      
      req.user = user; // Attach user object to request
      next();
    }).catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Server error during authorization' });
    });
  };
};

module.exports = roleAuth;
