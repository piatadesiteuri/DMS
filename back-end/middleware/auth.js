const authenticateToken = (req, res, next) => {
    // Check if there's a valid session
    if (!req.session || !req.session.id_user) {
        console.log('No valid session found');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Add user information to request
    req.user = {
        id: req.session.id_user,
        role: req.session.role,
        nom: req.session.nom,
        prenom: req.session.prenom
    };

    // Log successful authentication
    console.log('User authenticated:', {
        id: req.user.id,
        role: req.user.role,
        path: req.path
    });

    next();
};

// Middleware for checking permissions
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.session || !req.session.id_user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Check user permissions from session
        const userPermissions = req.session.permissions || {};
        if (!userPermissions[permission]) {
            console.log('Permission denied for user:', req.session.id_user);
            return res.status(403).json({ error: 'Permission denied' });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    checkPermission
}; 