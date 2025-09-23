-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: work_app
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id_department` int NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id_department`),
  UNIQUE KEY `department_name` (`department_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_categories`
--

DROP TABLE IF EXISTS `document_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_categories` (
  `id_category` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`id_category`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_categories`
--

LOCK TABLES `document_categories` WRITE;
/*!40000 ALTER TABLE `document_categories` DISABLE KEYS */;
INSERT INTO `document_categories` VALUES (1,'Generale','Documente generale'),(2,'Contracte','Toate tipurile de contracte'),(3,'Facturi','Facturi și chitanțe'),(4,'Rapoarte','Rapoarte și analize'),(5,'HR','Documente de resurse umane');
/*!40000 ALTER TABLE `document_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_keywords`
--

DROP TABLE IF EXISTS `document_keywords`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_keywords` (
  `id_document` int NOT NULL,
  `id_keyword` int NOT NULL,
  PRIMARY KEY (`id_document`,`id_keyword`),
  KEY `id_keyword` (`id_keyword`),
  CONSTRAINT `document_keywords_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `documents` (`id_document`) ON DELETE CASCADE,
  CONSTRAINT `document_keywords_ibfk_2` FOREIGN KEY (`id_keyword`) REFERENCES `keywords` (`id_keyword`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_keywords`
--

LOCK TABLES `document_keywords` WRITE;
/*!40000 ALTER TABLE `document_keywords` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_keywords` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_log`
--

DROP TABLE IF EXISTS `document_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `nom_doc` varchar(255) NOT NULL,
  `open_count` int DEFAULT '1',
  `last_opened_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `document_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_log`
--

LOCK TABLES `document_log` WRITE;
/*!40000 ALTER TABLE `document_log` DISABLE KEYS */;
INSERT INTO `document_log` VALUES (1,6,'john_report.pdf',15,'2025-03-23 13:03:31'),(2,6,'hak.pdf',30,'2025-03-23 13:50:26'),(3,6,'sample_report.pdf',5,'2025-03-23 14:18:56'),(4,6,'shared_document.pdf',8,'2025-03-23 13:04:48'),(5,6,'business_plan.pdf',2,'2025-03-23 12:22:39'),(6,6,'pdf-test.pdf',13,'2025-03-23 13:50:36'),(7,6,'file-sample_150kB.pdf',12,'2025-03-23 14:18:52'),(8,6,'redaction_scientifique_.pdf',8,'2025-03-23 12:49:58'),(9,6,'fdfd.pdf',8,'2025-03-23 13:54:45'),(10,6,'1mb.pdf',2,'2025-03-23 14:18:59');
/*!40000 ALTER TABLE `document_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_operations`
--

DROP TABLE IF EXISTS `document_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_operations` (
  `id_operation` int NOT NULL AUTO_INCREMENT,
  `id_document` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `operation_type` enum('upload','download','view','edit','delete') NOT NULL,
  `operation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `description` text,
  PRIMARY KEY (`id_operation`),
  KEY `id_document` (`id_document`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `document_operations_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `documents` (`id_document`),
  CONSTRAINT `document_operations_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_operations`
--

LOCK TABLES `document_operations` WRITE;
/*!40000 ALTER TABLE `document_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_tag_relations`
--

DROP TABLE IF EXISTS `document_tag_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_tag_relations` (
  `id_relation` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_tag` int NOT NULL,
  `added_by` int NOT NULL,
  `added_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_relation`),
  UNIQUE KEY `id_document_id_tag` (`id_document`,`id_tag`),
  KEY `id_tag` (`id_tag`),
  KEY `added_by` (`added_by`),
  CONSTRAINT `document_tag_relations_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`) ON DELETE CASCADE,
  CONSTRAINT `document_tag_relations_ibfk_2` FOREIGN KEY (`id_tag`) REFERENCES `document_tags` (`id_tag`) ON DELETE CASCADE,
  CONSTRAINT `document_tag_relations_ibfk_3` FOREIGN KEY (`added_by`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_tag_relations`
--

LOCK TABLES `document_tag_relations` WRITE;
/*!40000 ALTER TABLE `document_tag_relations` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_tag_relations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_tags`
--

DROP TABLE IF EXISTS `document_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_tags` (
  `id_tag` int NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(50) NOT NULL,
  `created_by` int DEFAULT NULL,
  `is_predefined` tinyint(1) DEFAULT '0',
  `usage_count` int DEFAULT '0',
  PRIMARY KEY (`id_tag`),
  UNIQUE KEY `tag_name` (`tag_name`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `document_tags_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_tags`
--

LOCK TABLES `document_tags` WRITE;
/*!40000 ALTER TABLE `document_tags` DISABLE KEYS */;
INSERT INTO `document_tags` VALUES (1,'Important',NULL,1,0),(2,'Urgent',NULL,1,0),(3,'Draft',NULL,1,0),(4,'Final',NULL,1,0),(5,'Archived',NULL,1,0);
/*!40000 ALTER TABLE `document_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id_document` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `id_category` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `comment` text,
  PRIMARY KEY (`id_document`),
  KEY `id_category` (`id_category`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`id_category`) REFERENCES `document_categories` (`id_category`),
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `keywords`
--

DROP TABLE IF EXISTS `keywords`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `keywords` (
  `id_keyword` int NOT NULL AUTO_INCREMENT,
  `keyword` varchar(50) NOT NULL,
  PRIMARY KEY (`id_keyword`),
  UNIQUE KEY `keyword` (`keyword`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `keywords`
--

LOCK TABLES `keywords` WRITE;
/*!40000 ALTER TABLE `keywords` DISABLE KEYS */;
/*!40000 ALTER TABLE `keywords` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('-bUI8DikDVVdIxQot-_EVf3nDsQIUJxw',1742825951,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-03-24T12:20:24.219Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"id_user\":6,\"nom\":\"Doe\",\"prenom\":\"John\",\"role\":\"user\"}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `table_document`
--

DROP TABLE IF EXISTS `table_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_document` (
  `id_document` int NOT NULL AUTO_INCREMENT,
  `nom_document` varchar(255) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `path` varchar(255) NOT NULL,
  `id_user_source` int DEFAULT NULL,
  `date_upload` datetime DEFAULT CURRENT_TIMESTAMP,
  `comment` text,
  `nom_document_original` varchar(255) DEFAULT NULL,
  `isVerfied` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_document`),
  KEY `id_user_source` (`id_user_source`),
  CONSTRAINT `table_document_ibfk_1` FOREIGN KEY (`id_user_source`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_document`
--

LOCK TABLES `table_document` WRITE;
/*!40000 ALTER TABLE `table_document` DISABLE KEYS */;
INSERT INTO `table_document` VALUES (1,'sample_report.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 10:55:52','This is a sample report','Annual Report 2024',1),(2,'business_plan.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 10:55:52','Business strategy plan','Business Plan 2024-2025',1),(3,'john_report.pdf','Official Document','./uploads/Official Document',6,'2025-03-21 11:03:53','Report for John','John Report 2024',1),(4,'shared_document.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 11:04:34','Document shared with John','Shared Document 2024',1),(5,'shared_document.pdf','Shared Document','./uploads/Shared Document',1,'2025-03-21 11:18:49','Document shared with John','Shared Document 2024',1),(6,'hak.pdf','t1','./uploads/t1',6,'2025-03-21 12:34:00','Test hak document','hak.pdf',1),(7,'redaction_scientifique_.pdf','t2','./uploads/t2',6,'2025-03-21 14:08:34','mcmcmc','doc',1),(8,'redaction_scientifique_.pdf','t3','./uploads/t3',6,'2025-03-21 14:11:13','coms','aaa',1),(9,'file-sample_150kB.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 11:41:31','Comments','TestPdf',1),(10,'file-sample_150kB.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 11:53:32','Comentarii','Safir',1),(11,'pdf-test.pdf','t2','./uploads/t2',6,'2025-03-23 12:15:49','vvvvvv','TEstare',1),(12,'pdf-test.pdf','t4','./uploads/t4',6,'2025-03-23 12:23:00','caaa','ccaa',1),(13,'pdf-test.pdf','t3','./uploads/t3',6,'2025-03-23 12:26:42','ssss','fsfsf',1),(14,'fdfd.pdf','t3','./uploads/t3',6,'2025-03-23 12:36:23','DDDD','FFFF',1),(15,'pdf-test.pdf','t4','./uploads/t4',6,'2025-03-23 12:59:18','scacs','cc',1),(16,'1mb.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 13:54:12','Providing a sample PDF for educational or business use\r\nGet Started Now','File Content: Dummy Text (Sample PDF)',1);
/*!40000 ALTER TABLE `table_document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `table_mot_cle`
--

DROP TABLE IF EXISTS `table_mot_cle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_mot_cle` (
  `id_mot_cle` int NOT NULL AUTO_INCREMENT,
  `id_document` int DEFAULT NULL,
  `mot1` varchar(50) DEFAULT NULL,
  `mot2` varchar(50) DEFAULT NULL,
  `mot3` varchar(50) DEFAULT NULL,
  `mot4` varchar(50) DEFAULT NULL,
  `mot5` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_mot_cle`),
  KEY `id_document` (`id_document`),
  CONSTRAINT `table_mot_cle_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_mot_cle`
--

LOCK TABLES `table_mot_cle` WRITE;
/*!40000 ALTER TABLE `table_mot_cle` DISABLE KEYS */;
INSERT INTO `table_mot_cle` VALUES (1,1,'annual','report','finance','summary','data'),(2,2,'strategy','business','planning','forecast','goals'),(3,3,'report','john','document','test','example'),(4,10,'Stats, lorem','','','',''),(5,11,'non, coress','','','',''),(6,12,'cc','','','',''),(7,13,'ssss','','','',''),(8,14,'ADdd','','','',''),(9,15,'sasc','','','',''),(10,16,'educational, business ','','','','');
/*!40000 ALTER TABLE `table_mot_cle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `table_previlege`
--

DROP TABLE IF EXISTS `table_previlege`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_previlege` (
  `id_previlege` int NOT NULL AUTO_INCREMENT,
  `id_user_fk` int DEFAULT NULL,
  `nom_doc` varchar(255) DEFAULT NULL,
  `download` tinyint(1) DEFAULT '0',
  `upload` tinyint(1) DEFAULT '0',
  `print` tinyint(1) DEFAULT '0',
  `comment` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_previlege`),
  KEY `id_user_fk` (`id_user_fk`),
  CONSTRAINT `table_previlege_ibfk_1` FOREIGN KEY (`id_user_fk`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_previlege`
--

LOCK TABLES `table_previlege` WRITE;
/*!40000 ALTER TABLE `table_previlege` DISABLE KEYS */;
INSERT INTO `table_previlege` VALUES (1,14,'sample_report.pdf',1,1,1,1),(2,15,'sample_report.pdf',1,1,1,1),(3,14,'business_plan.pdf',1,1,1,1),(4,15,'business_plan.pdf',1,0,1,0),(5,6,'john_report.pdf',1,1,1,1),(6,6,'shared_document.pdf',1,1,1,1),(7,6,'redaction_scientifique_.pdf',1,1,1,1),(8,6,'redaction_scientifique_.pdf',1,1,1,1),(9,6,'file-sample_150kB.pdf',1,1,1,1),(10,6,'file-sample_150kB.pdf',1,1,1,1),(11,6,'pdf-test.pdf',1,1,1,1),(12,6,'pdf-test.pdf',1,1,1,1),(13,6,'pdf-test.pdf',1,1,1,1),(14,6,'fdfd.pdf',1,1,1,1),(15,6,'pdf-test.pdf',1,1,1,1),(16,6,'1mb.pdf',1,1,1,1);
/*!40000 ALTER TABLE `table_previlege` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id_user` int NOT NULL AUTO_INCREMENT,
  `prenom` varchar(50) DEFAULT NULL,
  `nom` varchar(50) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `diffuse` tinyint(1) DEFAULT '0',
  `upload` tinyint(1) DEFAULT '0',
  `download` tinyint(1) DEFAULT '0',
  `print` tinyint(1) DEFAULT '0',
  `roles` varchar(20) DEFAULT 'user',
  `accepted` tinyint(1) DEFAULT '0',
  `verified` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'Admin','System','admin@example.com','$2b$10$c7XBHzTPfkMnooKOU2bPH.DXgxshDVNj4jKkzMHzYVcMqYYfaKiqO',1,1,1,1,'admin',1,1),(2,'test','test2','test2@gmail.com','$2b$10$AzPXN0dFmDfe.YgwrepOa.ai2GksXyXtv45UkOK9nC//WRblZQ9Tm',1,1,0,1,'responsable',1,0),(3,'ccccc','dddd','cd@gmail.com','$2b$10$W5dsHBgUr0WSfjE./N0JZO33neqJgMoMdyOu/tdTu84BG3j9ooA5C',0,1,1,0,'user',1,0),(4,'John','Doe','john@example.com','b/GE9McQEPG',1,1,1,1,'user',1,1),(5,'Jane','Smith','jane@example.com','b/GE9McQEPG',1,1,1,1,'responsable',1,1),(6,'John','Doe','john.doe@example.com','$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,1,1,1,'user',1,1),(9,'dgfd','fdgdfgdfg','dfgdfg','$2b$10$4a.pin8oy84CxE27jKljBeXrFvMcYUUybZEyl52bXjk./5uAGcVya',0,0,0,0,'user',0,0),(14,'Alex','Smith','alex.smith@example.com','$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,1,1,1,'user',1,1),(15,'Maria','Garcia','maria.garcia@example.com','$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,1,1,1,'user',1,1);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_departments`
--

DROP TABLE IF EXISTS `user_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_departments` (
  `id_user` int NOT NULL,
  `id_department` int NOT NULL,
  PRIMARY KEY (`id_user`,`id_department`),
  KEY `id_department` (`id_department`),
  CONSTRAINT `user_departments_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  CONSTRAINT `user_departments_ibfk_2` FOREIGN KEY (`id_department`) REFERENCES `departments` (`id_department`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_departments`
--

LOCK TABLES `user_departments` WRITE;
/*!40000 ALTER TABLE `user_departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id_user` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` enum('admin','user','guest') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$10$d5lHSqJWQjYcNxGo6sJMweMM9mxwAdJXLJMw0Q5UUOy/GE9McQEPG','admin@example.com','Administrator','admin','2025-03-21 08:19:37',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-23 16:27:24
