-- Import only essential user data for immediate login testing
-- This includes your user account: raulrusescu@gmail.com

-- First, let's insert some basic users including yours
INSERT INTO `user` (id_user, nom, prenom, email, telefon, password, verified, accepted, upload, download, print, diffuse, roles, diffuse_accept, upload_accept, document_count_limit, comments_count, institution_id, folder_id, personal_folder, plan_description, plan_type) VALUES 
(1,'Admin','System','admin@example.com',NULL,'$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z',1,1,1,1,1,1,'admin',1,1,NULL,20,1,NULL,NULL,NULL,'free'),
(25,'Raul','Rusescu','raulrusescu@gmail.com','0734342342','$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa',1,1,1,1,1,1,'user',1,1,NULL,20,2,3,NULL,NULL,'free'),
(20,'Super','Admin','superadmin@example.com',NULL,'$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,1,1,'superadmin',1,1,NULL,NULL,2,3,NULL,NULL,'free');

-- Insert some basic document types if they don't exist
INSERT IGNORE INTO `document_types` (id, type_name, description, folder_path, created_at, institution_id) VALUES 
(1,'Official Document','Official documents and reports',NULL,'2025-04-01 11:36:02',3),
(2,'Shared Document','Documents shared between users',NULL,'2025-04-01 11:36:02',3),
(3,'General Document','General documents',NULL,'2025-04-01 11:36:02',3),
(4,'Others','Other types of documents',NULL,'2025-04-01 11:36:02',3);

-- Insert some institutions if they don't exist
INSERT IGNORE INTO `institutions` (id_institution, name, address, contact_email, contact_phone, created_at) VALUES 
(1,'Default Institution','Default Address','admin@example.com','0123456789',NOW()),
(2,'Scoala Dabuleni','Dabuleni','admin.dabuleni@gmail.com','0734525423',NOW()),
(3,'CERIST','Bucharest','admin@cerist.ro','0123456789',NOW());
