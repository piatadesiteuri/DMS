-- MySQL dump 10.13  Distrib 8.0.41, for macos15 (x86_64)
--
-- Host: 127.0.0.1    Database: digital_documents_db
-- ------------------------------------------------------
-- Server version	9.2.0

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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_log`
--

LOCK TABLES `document_log` WRITE;
/*!40000 ALTER TABLE `document_log` DISABLE KEYS */;
INSERT INTO `document_log` VALUES (1,6,'john_report.pdf',16,'2025-03-24 07:18:10'),(2,6,'hak.pdf',30,'2025-03-23 13:50:26'),(3,6,'sample_report.pdf',5,'2025-03-23 14:18:56'),(4,6,'shared_document.pdf',9,'2025-03-23 14:38:06'),(5,6,'business_plan.pdf',2,'2025-03-23 12:22:39'),(6,6,'pdf-test.pdf',16,'2025-03-24 12:39:30'),(7,6,'file-sample_150kB.pdf',17,'2025-03-24 12:12:11'),(8,6,'redaction_scientifique_.pdf',8,'2025-03-23 12:49:58'),(9,6,'fdfd.pdf',42,'2025-03-25 06:18:36'),(10,6,'1mb.pdf',12,'2025-03-24 07:17:19'),(11,14,'fdfd.pdf',2,'2025-03-23 16:05:40'),(12,14,'1mb.pdf',1,'2025-03-23 16:14:44'),(13,6,'10MB-TESTFILE.ORG.pdf',4,'2025-03-24 09:26:03'),(14,6,'2mb.pdf',7,'2025-03-24 12:12:03'),(15,6,'_TestPdf_.pdf',10,'2025-03-24 12:36:25'),(16,6,'_FFFF_.pdf',7,'2025-03-24 13:29:20'),(17,6,'Get_Started_With_Smallpdf.pdf',3,'2025-03-24 14:55:14'),(18,6,'260KB.pdf',2,'2025-03-24 13:33:11'),(19,6,'_SmallPdf_Doc_.pdf',4,'2025-03-24 14:45:09'),(20,6,'350KB.pdf',23,'2025-03-25 07:45:25');
/*!40000 ALTER TABLE `document_log` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_tag_relations`
--

LOCK TABLES `document_tag_relations` WRITE;
/*!40000 ALTER TABLE `document_tag_relations` DISABLE KEYS */;
INSERT INTO `document_tag_relations` VALUES (1,36,1,6,'2025-03-24 16:51:39'),(2,38,12,6,'2025-03-24 16:54:05'),(3,38,6,6,'2025-03-24 16:54:05'),(4,38,3,6,'2025-03-24 16:54:05'),(5,39,13,6,'2025-03-25 08:50:35'),(6,39,9,6,'2025-03-25 08:50:35'),(7,39,6,6,'2025-03-25 08:50:35');
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_tags`
--

LOCK TABLES `document_tags` WRITE;
/*!40000 ALTER TABLE `document_tags` DISABLE KEYS */;
INSERT INTO `document_tags` VALUES (1,'Important',NULL,1,0),(2,'Urgent',NULL,1,0),(3,'Draft',NULL,1,1),(4,'Final',NULL,1,0),(5,'Archived',NULL,1,0),(6,'Educational',6,0,2),(7,'Yok',6,0,0),(8,'Lex',6,0,0),(9,'Animation',6,0,1),(10,'AI',6,0,0),(11,'ff',6,0,0),(12,'Tag nou',6,0,1),(13,'<1mb',6,0,1);
/*!40000 ALTER TABLE `document_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_versions`
--

DROP TABLE IF EXISTS `document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_versions` (
  `id_version` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `version_number` int NOT NULL,
  `change_summary` text,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_current` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_version`),
  KEY `id_document` (`id_document`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`),
  CONSTRAINT `document_versions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_versions`
--

LOCK TABLES `document_versions` WRITE;
/*!40000 ALTER TABLE `document_versions` DISABLE KEYS */;
INSERT INTO `document_versions` VALUES (1,35,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_FFFF_.pdf',1,'Initial version',6,'2025-03-24 15:28:04',1),(2,36,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/260KB.pdf',1,'Initial version',6,'2025-03-24 15:31:46',1),(3,37,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/_SmallPdf_Doc_.pdf',1,'Initial version',6,'2025-03-24 15:54:40',1),(4,38,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t4/Get_Started_With_Smallpdf.pdf',1,'Initial version',6,'2025-03-24 16:54:05',1),(5,39,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB.pdf',1,'Initial version',6,'2025-03-25 08:50:35',1);
/*!40000 ALTER TABLE `document_versions` ENABLE KEYS */;
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
INSERT INTO `sessions` VALUES ('1-DowxYPVueGuaK3USMGPjgzl51LPkAS',1742976114,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-03-25T12:11:06.527Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"id_user\":6,\"nom\":\"Doe\",\"prenom\":\"John\",\"role\":\"user\"}');
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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_document`
--

LOCK TABLES `table_document` WRITE;
/*!40000 ALTER TABLE `table_document` DISABLE KEYS */;
INSERT INTO `table_document` VALUES (1,'sample_report.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 10:55:52','This is a sample report','Annual Report 2024',1),(2,'business_plan.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 10:55:52','Business strategy plan','Business Plan 2024-2025',1),(3,'john_report.pdf','Official Document','./uploads/Official Document',6,'2025-03-21 11:03:53','Report for John','John Report 2024',1),(4,'shared_document.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 11:04:34','Document shared with John','Shared Document 2024',1),(5,'shared_document.pdf','Shared Document','./uploads/Shared Document',1,'2025-03-21 11:18:49','Document shared with John','Shared Document 2024',1),(6,'hak.pdf','t1','./uploads/t1',6,'2025-03-21 12:34:00','Test hak document','hak.pdf',1),(7,'redaction_scientifique_.pdf','t2','./uploads/t2',6,'2025-03-21 14:08:34','mcmcmc','doc',1),(8,'redaction_scientifique_.pdf','t3','./uploads/t3',6,'2025-03-21 14:11:13','coms','aaa',1),(9,'file-sample_150kB.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 11:41:31','Comments','TestPdf',1),(10,'file-sample_150kB.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 11:53:32','Comentarii','Safir',1),(11,'pdf-test.pdf','t2','./uploads/t2',6,'2025-03-23 12:15:49','vvvvvv','TEstare',1),(12,'pdf-test.pdf','t4','./uploads/t4',6,'2025-03-23 12:23:00','caaa','ccaa',1),(13,'pdf-test.pdf','t3','./uploads/t3',6,'2025-03-23 12:26:42','ssss','fsfsf',1),(14,'fdfd.pdf','t3','./uploads/t3',6,'2025-03-23 12:36:23','DDDD','FFFF',1),(15,'pdf-test.pdf','t4','./uploads/t4',6,'2025-03-23 12:59:18','scacs','cc',1),(16,'1mb.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 13:54:12','Providing a sample PDF for educational or business use\r\nGet Started Now','File Content: Dummy Text (Sample PDF)',1),(17,'1mb.pdf','t3','./uploads/t3',6,'2025-03-23 14:30:53','Objective: This file is ideal for blank document needs, obtaining a new PDF file, testing file uploads','File Name TTT',1),(18,'pdf-test.pdf','t2','./uploads/t2',6,'2025-03-23 14:37:15','Yukon Department of Education\r\nBox 2703\r\nWhitehorse,Yukon\r\nCanada\r\nY1A 2C6\r\nPlease visit our website at: http://www.education.gov.yk.ca/','yoko',1),(19,'fdfd.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 15:11:48','ate ac suscipit et, iaculis non est. Curabitur semper arcu ac ligula semper, nec luctus\r\nnisl blandit. Integer lacinia ante ac libero lobortis imperdiet.\r\nNullam mollis convallis ipsum,\r\nac accumsan nunc vehicula vitae. Nulla eget justo in felis tristique fringilla. Morbi sit amet\r\ntortor quis risus ','Lorem ipsum2',1),(20,'1mb.pdf','t4','./uploads/t4',14,'2025-03-23 15:52:31','xperimenting with PDF rendering and formatting in your applications\r\nProviding a sample PDF for educational or business use\r\nGet Started Now:\r\nWhether you\'re a','sample pdf file ',1),(21,'fdfd.pdf','Official Document','./uploads/Official Document',14,'2025-03-23 16:02:57','putate ac suscipit et, iaculis non est. Curabitur semper arcu ac ligula semper, nec luctus\r\nnisl blandit. Integer lacinia ante ac libero lobortis imperdiet.\r\nNullam mollis convallis ipsum,\r\nac accumsan nunc vehicula vitae. Nulla eget justo in felis tristique fringilla. Morbi sit amet\r\ntortor quis risus auctor condimentum. Morbi in ullamcorper elit. Nulla iaculis tellus sit amet\r\nmauris tempus fringilla.\r\nMaecenas mauris lectus, lobortis et','Lorem ipsum32323',1),(22,'1mb.pdf','t3','./uploads/t3',14,'2025-03-23 16:08:37','t in your testing and development projects. Simply click the download button to get started\r\nwith your sample PDF download!\r\nInformation About PDF Format\r\nPDF stands for Portable Document Format and was developed by Adobe Systems. It combines rich\r\ncontent such as text, images and hyperlinks, allowing users to share documents across different\r\noperating systems and devices with the same view. Its wide use has made it indispensable for\r\nelectronic document sharing. Thanks to its open-source readers and software, viewing and editing','File Content About PDF Format',1),(23,'fdfd.pdf','t3','./uploads/t3',14,'2025-03-23 16:14:19','. Maecenas sed egestas nulla, ac condimentum orci. Mauris diam felis,\r\nvulputate ac suscip','ipsum odio',1),(24,'10MB-TESTFILE.ORG.pdf','t3','./uploads/undefined',6,'2025-03-24 07:25:13','You will be recorded as the document author. Documents can be searched by author name.','TESTFILE.ORGG',1),(25,'2mb.pdf','Official Document','./uploads/undefined',6,'2025-03-24 08:28:42','xperimenting with PDF rendering and formatting in your applications\r\nProviding a sample PDF for educational or business use','2mb document',1),(26,'2mb.pdf','Official Document','./uploads/undefined',6,'2025-03-24 08:54:58','dsdsdsdsd','cccssssss',1),(27,'_TestPdf_.pdf','t2','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default',6,'2025-03-24 10:42:38','mulet comsssda','testing file',1),(28,'2mb.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default',6,'2025-03-24 10:47:43','afsddasfsdfdjsfdskjdsafkjdsnf','wwe',1),(29,'_TestPdf_.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 11:30:09','sem. Nullam at porttitor arcu, nec lacinia nisi. Ut ac dolor vitae odio interdum\r\ncondimentum. Vivamus dapibus sodales ex, vitae malesuada ipsum cursus\r\nconvallis. Maecenas sed egestas nulla, ac condimentum orci. Mauris diam felis,\r\nvulputate ac suscipit et, iaculis non est. Curabitur semper arcu ac ligula semper, nec luctus\r\nnisl blandit. Integer laci','GGWP2',1),(30,'_TestPdf_.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 11:36:22','. Maecenas sed egestas nulla, ac condimentum orci. Mauris diam felis,\r\nvulputate a','WWE2k2000',1),(31,'GGWPPasere','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 11:47:06','nisl blandit. Integer lacinia ante ac libero lobortis imperdiet.','GGWPPasere',1),(32,'Nume_Current','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 12:35:40','KSKDKSDSKDKD','Nume_Current',1),(33,'_FFFF_.pdf','t3','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3',6,'2025-03-24 12:40:03','comment','nume document',1),(34,'Get_Started_With_Smallpdf.pdf','t3','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3',6,'2025-03-24 12:54:36','Forget mundane administrative tasks. With','SmallPdf_Doc',1),(35,'_FFFF_.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 13:28:04','dsfdsfdsf','dsfdsfsdfdsf',1),(36,'260KB.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 13:31:46','fdsfsdfdsfsdf','NUme Onest',1),(37,'_SmallPdf_Doc_.pdf','t3','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3',6,'2025-03-24 13:54:40','nonkeys','FFFFSSSSSD',1),(38,'Get_Started_With_Smallpdf.pdf','t4','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t4',6,'2025-03-24 14:54:05','nu am','HHHHHHHHHH',1),(39,'350KB.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-25 06:50:35','Now residence dashwoods she excellent you. Shade being under his bed her. Much read on as draw. Blessing for ignorant exercise any yourself unpacked. Pleasant horrible but confined day end marriage. Eagerness furniture set preserved far recommend. Did even but nor are most gave hope. Secure active living depend son repair day ladies now.','Documnet cu 350kb',1);
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
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_mot_cle`
--

LOCK TABLES `table_mot_cle` WRITE;
/*!40000 ALTER TABLE `table_mot_cle` DISABLE KEYS */;
INSERT INTO `table_mot_cle` VALUES (1,1,'annual','report','finance','summary','data'),(2,2,'strategy','business','planning','forecast','goals'),(3,3,'report','john','document','test','example'),(4,10,'Stats, lorem','','','',''),(5,11,'non, coress','','','',''),(6,12,'cc','','','',''),(7,13,'ssss','','','',''),(8,14,'ADdd','','','',''),(9,15,'sasc','','','',''),(10,16,'educational, business ','','','',''),(11,17,'developer, designer, content creator','','','',''),(12,18,'Whitehorse,Yukon','','','',''),(13,19,'Vivamus','','','',''),(14,20,'developer,designer','','','',''),(15,21,'Maecenas','','','',''),(16,22,'developer, designer','','','',''),(17,23,'varius','','','',''),(18,24,'TEst file','animation','','',''),(19,25,'Doc','Pdf file','adobe','',''),(20,26,'csdsss','','','',''),(21,27,'acum','aici','','',''),(22,28,'randy','','','',''),(23,29,'Nentodom','','','',''),(24,30,'Nunc','','','',''),(25,31,'nombre','estare','','',''),(26,32,'Nume','','','',''),(27,33,'keyword','','','',''),(28,34,'Digital','Enhance','','',''),(29,35,'fsdfdsf','','','',''),(30,36,'fdsfsdfdsfsd','','','',''),(31,37,'keys','','','',''),(32,38,'ce o fi','','','',''),(33,39,'350','large doc','','','');
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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_previlege`
--

LOCK TABLES `table_previlege` WRITE;
/*!40000 ALTER TABLE `table_previlege` DISABLE KEYS */;
INSERT INTO `table_previlege` VALUES (1,14,'sample_report.pdf',1,1,1,1),(2,15,'sample_report.pdf',1,1,1,1),(3,14,'business_plan.pdf',1,1,1,1),(4,15,'business_plan.pdf',1,0,1,0),(5,6,'john_report.pdf',1,1,1,1),(6,6,'shared_document.pdf',1,1,1,1),(7,6,'redaction_scientifique_.pdf',1,1,1,1),(8,6,'redaction_scientifique_.pdf',1,1,1,1),(9,6,'file-sample_150kB.pdf',1,1,1,1),(10,6,'file-sample_150kB.pdf',1,1,1,1),(11,6,'pdf-test.pdf',1,1,1,1),(12,6,'pdf-test.pdf',1,1,1,1),(13,6,'pdf-test.pdf',1,1,1,1),(14,6,'fdfd.pdf',1,1,1,1),(15,6,'pdf-test.pdf',1,1,1,1),(16,6,'1mb.pdf',1,1,1,1),(17,6,'1mb.pdf',1,1,1,1),(18,6,'pdf-test.pdf',1,1,1,1),(19,6,'fdfd.pdf',1,1,1,1),(20,14,'1mb.pdf',1,1,1,1),(21,14,'fdfd.pdf',1,1,1,1),(22,14,'1mb.pdf',1,1,1,1),(23,14,'fdfd.pdf',1,1,1,1),(24,6,'10MB-TESTFILE.ORG.pdf',1,1,1,1),(25,6,'2mb.pdf',1,1,1,1),(26,6,'2mb.pdf',1,1,1,1),(27,6,'_TestPdf_.pdf',1,1,1,1),(28,6,'2mb.pdf',1,1,1,1),(29,6,'_TestPdf_.pdf',1,1,1,1),(30,6,'_TestPdf_.pdf',1,1,1,1),(31,6,'GGWPPasere',1,1,1,1),(32,6,'Nume_Current',1,1,1,1),(33,6,'_FFFF_.pdf',1,1,1,1),(34,6,'Get_Started_With_Smallpdf.pdf',1,1,1,1),(35,6,'_FFFF_.pdf',1,1,1,1),(36,6,'260KB.pdf',1,1,1,1),(37,6,'_SmallPdf_Doc_.pdf',1,1,1,1),(38,6,'Get_Started_With_Smallpdf.pdf',1,1,1,1),(39,6,'350KB.pdf',1,1,1,1);
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-25 10:06:03
