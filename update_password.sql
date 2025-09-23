-- Update password to a known hash for 'password'
USE PSPD;

-- Update raulrusescu@gmail.com with a known password hash (password = 'password')
UPDATE user SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email = 'raulrusescu@gmail.com';

-- Also update admin with same password
UPDATE user SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email = 'admin@example.com';

-- Show updated users
SELECT id_user, nom, prenom, email, roles FROM user;
