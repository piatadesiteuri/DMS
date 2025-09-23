function authenticate (req, res, next) { 
    const withoutAuth = ['/register', '/login']
    console.log(withoutAuth.includes(req.url));
    
    if (!req.session.id_user) {
        console.log("No user ID in session");
        const err = new Error('You are not authenticated!');
        err.statusCode = 401;
        next(err);
    } else {
        console.log("User authenticated with ID:", req.session.id_user);
        next();
    }
}

module.exports = {authenticate} 