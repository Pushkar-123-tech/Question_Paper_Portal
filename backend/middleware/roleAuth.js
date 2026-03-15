const supabase = require('../supabaseClient');

const roleAuth = (roles) => {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

      if (!user || error) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
      }
      
      req.user = user; // Attach user object to request
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};

module.exports = roleAuth;
