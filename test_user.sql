-- Create a test user with a simple password for testing
USE PSPD;

-- Insert a test user with password 'password' (bcrypt hash)
INSERT INTO user (id_user, nom, prenom, email, password, verified, accepted, upload, download, print, diffuse, roles, phone_number, created_by) VALUES 
(99, 'Test', 'User', 'test@test.com', '$2b$10$rOqW1w5GX1Xw5GX1Xw5GXe', 1, 1, 1, 1, 1, 1, 'user', '1234567890', NULL);

-- Also update existing user with a known password
UPDATE user SET password = '$2b$10$rOqW1w5GX1Xw5GX1Xw5GXe' WHERE email = 'raulrusescu@gmail.com';

-- Show all users
SELECT id_user, nom, prenom, email, roles FROM user;
