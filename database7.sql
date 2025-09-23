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
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_log`
--

LOCK TABLES `document_log` WRITE;
/*!40000 ALTER TABLE `document_log` DISABLE KEYS */;
INSERT INTO `document_log` VALUES (1,6,'john_report.pdf',21,'2025-03-26 07:02:00'),(2,6,'hak.pdf',30,'2025-03-23 13:50:26'),(3,6,'sample_report.pdf',5,'2025-03-23 14:18:56'),(4,6,'shared_document.pdf',12,'2025-03-25 13:46:46'),(5,6,'business_plan.pdf',2,'2025-03-23 12:22:39'),(6,6,'pdf-test.pdf',17,'2025-03-27 10:17:03'),(7,6,'file-sample_150kB.pdf',18,'2025-03-27 09:51:25'),(8,6,'redaction_scientifique_.pdf',8,'2025-03-23 12:49:58'),(9,6,'fdfd.pdf',43,'2025-03-25 13:46:33'),(10,6,'1mb.pdf',12,'2025-03-24 07:17:19'),(11,14,'fdfd.pdf',2,'2025-03-23 16:05:40'),(12,14,'1mb.pdf',1,'2025-03-23 16:14:44'),(13,6,'10MB-TESTFILE.ORG.pdf',4,'2025-03-24 09:26:03'),(14,6,'2mb.pdf',7,'2025-03-24 12:12:03'),(15,6,'_TestPdf_.pdf',11,'2025-03-25 12:46:44'),(16,6,'_FFFF_.pdf',7,'2025-03-24 13:29:20'),(17,6,'Get_Started_With_Smallpdf.pdf',7,'2025-03-25 13:38:37'),(18,6,'260KB.pdf',2,'2025-03-24 13:33:11'),(19,6,'_SmallPdf_Doc_.pdf',5,'2025-03-25 13:38:41'),(20,6,'350KB.pdf',29,'2025-03-25 13:46:52'),(21,6,'PDF_TestPage.pdf',1,'2025-03-25 14:27:16'),(22,6,'350KB_v1742983550098.pdf',1,'2025-03-26 10:07:03'),(23,6,'1.5MB_v1742995565983.pdf',1,'2025-03-26 13:59:26'),(24,6,'_nume document__v1743000366741.pdf',2,'2025-03-27 06:38:41'),(25,6,'2mb_v1743059981050.pdf',1,'2025-03-27 07:29:01'),(26,6,'STatistici_v1743145773358.pdf',2,'2025-03-28 07:53:50'),(27,6,'STatistici_v1743148814921.pdf',1,'2025-03-28 10:50:25'),(28,18,'_nume document_ (1)_v1743418668193.pdf',1,'2025-03-31 11:04:54'),(29,18,'AndreiPdf_v1743412879118.pdf',1,'2025-03-31 11:04:56'),(30,18,'_SmallPdf_Doc__v1743419879684.pdf',1,'2025-03-31 11:18:39'),(31,18,'_FFFFSSSSSD__v1743420535812.pdf',2,'2025-03-31 11:45:39'),(32,18,'_FFFF_.pdf',1,'2025-03-31 12:11:50');
/*!40000 ALTER TABLE `document_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_statistics`
--

DROP TABLE IF EXISTS `document_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_statistics` (
  `id_statistic` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_user` int NOT NULL,
  `action_type` enum('download','view') NOT NULL,
  `action_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_statistic`),
  KEY `id_document` (`id_document`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `document_statistics_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`),
  CONSTRAINT `document_statistics_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_statistics`
--

LOCK TABLES `document_statistics` WRITE;
/*!40000 ALTER TABLE `document_statistics` DISABLE KEYS */;
INSERT INTO `document_statistics` VALUES (1,1,1,'download','2025-03-27 11:28:49'),(2,1,1,'view','2025-03-27 11:28:49'),(3,2,1,'download','2025-03-27 11:28:49'),(4,45,6,'download','2025-03-27 11:42:23'),(5,45,6,'download','2025-03-27 11:42:24'),(6,45,6,'download','2025-03-27 11:47:41'),(7,45,6,'download','2025-03-27 11:49:59'),(8,44,6,'download','2025-03-27 12:01:39'),(9,44,6,'download','2025-03-27 12:35:27'),(10,45,6,'download','2025-03-27 12:40:47'),(11,45,6,'download','2025-03-27 13:28:05'),(12,45,6,'download','2025-03-27 13:28:43'),(13,45,6,'download','2025-03-27 13:38:50'),(14,45,6,'download','2025-03-27 13:55:21'),(15,45,6,'download','2025-03-27 13:55:24'),(16,45,6,'download','2025-03-27 13:55:40'),(17,45,6,'download','2025-03-27 14:02:01'),(18,45,6,'download','2025-03-27 14:04:15'),(19,45,6,'download','2025-03-27 14:08:29'),(20,45,6,'download','2025-03-27 14:26:54'),(21,45,6,'download','2025-03-27 14:26:58'),(22,45,6,'download','2025-03-27 14:30:47'),(23,45,6,'download','2025-03-27 14:31:01'),(24,36,6,'download','2025-03-27 14:35:29'),(25,36,6,'download','2025-03-27 14:35:32'),(26,45,6,'download','2025-03-27 14:46:02'),(27,45,6,'download','2025-03-27 14:46:05'),(28,45,6,'download','2025-03-27 14:50:55'),(29,45,6,'download','2025-03-27 14:50:57'),(30,36,6,'download','2025-03-27 14:59:54'),(31,44,6,'download','2025-03-27 14:59:57'),(32,36,6,'download','2025-03-27 15:00:00'),(33,45,6,'download','2025-03-27 15:00:05'),(34,45,6,'download','2025-03-27 15:00:35'),(35,45,6,'download','2025-03-27 15:00:38'),(36,45,6,'download','2025-03-28 06:31:04'),(37,45,6,'download','2025-03-28 07:01:32'),(38,45,6,'download','2025-03-28 07:06:20'),(39,45,6,'download','2025-03-28 07:06:49'),(40,45,6,'download','2025-03-28 07:33:46'),(41,45,6,'download','2025-03-28 07:45:18'),(42,45,6,'download','2025-03-28 07:45:46'),(43,45,6,'download','2025-03-28 08:12:01'),(44,45,6,'download','2025-03-28 08:33:30'),(45,45,6,'download','2025-03-28 08:33:35'),(46,45,6,'download','2025-03-28 08:50:34'),(47,45,6,'download','2025-03-28 09:30:06'),(48,45,6,'download','2025-03-28 10:57:52'),(49,45,6,'download','2025-03-28 11:35:32'),(50,45,6,'download','2025-03-28 11:35:48'),(51,45,6,'download','2025-03-28 11:50:04'),(52,49,6,'download','2025-03-28 11:52:41'),(53,49,6,'download','2025-03-28 11:53:07'),(54,49,6,'download','2025-03-28 12:14:09'),(55,45,6,'download','2025-03-28 12:14:23'),(56,45,6,'download','2025-03-28 12:47:55'),(57,36,14,'download','2025-03-28 12:57:56'),(58,45,6,'download','2025-03-28 13:29:11'),(59,45,6,'download','2025-03-28 14:17:54'),(60,45,6,'download','2025-03-28 14:44:40'),(61,45,6,'download','2025-03-28 14:44:40'),(62,36,6,'download','2025-03-31 05:30:37'),(63,49,6,'download','2025-03-31 05:30:46'),(64,45,6,'download','2025-03-31 05:31:00'),(65,45,6,'download','2025-03-31 06:35:04'),(66,49,6,'download','2025-03-31 07:09:25'),(67,45,6,'download','2025-03-31 08:45:56'),(68,45,18,'download','2025-03-31 08:51:36'),(69,51,18,'download','2025-03-31 08:53:47'),(70,51,18,'download','2025-03-31 09:20:48'),(71,49,6,'download','2025-03-31 10:09:14'),(72,52,6,'download','2025-03-31 10:10:44'),(73,52,6,'download','2025-03-31 10:11:27'),(74,33,19,'download','2025-03-31 10:47:40'),(75,33,19,'download','2025-03-31 10:48:06'),(76,33,19,'download','2025-03-31 10:48:11'),(77,33,19,'download','2025-03-31 10:50:47'),(78,33,19,'download','2025-03-31 10:50:58'),(79,33,19,'download','2025-03-31 10:51:29'),(80,33,19,'download','2025-03-31 10:52:26'),(81,33,19,'download','2025-03-31 10:53:09'),(82,52,6,'download','2025-03-31 10:53:23'),(83,49,6,'download','2025-03-31 10:53:27'),(84,51,18,'download','2025-03-31 10:54:07'),(85,54,18,'download','2025-03-31 10:54:58'),(86,54,18,'download','2025-03-31 10:55:02'),(87,51,18,'download','2025-03-31 10:55:07'),(88,54,18,'download','2025-03-31 10:55:08'),(89,54,18,'download','2025-03-31 10:57:15'),(90,54,18,'download','2025-03-31 10:57:38'),(91,54,18,'download','2025-03-31 11:01:49'),(92,51,18,'download','2025-03-31 11:01:53'),(93,54,18,'download','2025-03-31 11:05:04'),(94,54,18,'download','2025-03-31 11:05:23'),(95,54,18,'download','2025-03-31 11:07:02'),(96,54,18,'download','2025-03-31 11:07:30'),(97,54,18,'download','2025-03-31 11:10:28'),(98,54,18,'download','2025-03-31 11:10:42'),(99,54,18,'download','2025-03-31 11:14:09'),(100,54,18,'download','2025-03-31 11:14:28'),(101,54,18,'download','2025-03-31 11:15:47'),(102,54,18,'download','2025-03-31 11:17:46'),(103,54,18,'download','2025-03-31 11:18:12'),(104,54,18,'download','2025-03-31 11:18:41'),(105,54,18,'download','2025-03-31 11:24:18'),(106,54,18,'download','2025-03-31 11:26:41'),(107,54,18,'download','2025-03-31 11:28:37'),(108,54,18,'download','2025-03-31 11:35:29'),(109,54,18,'download','2025-03-31 11:43:50'),(110,54,18,'download','2025-03-31 11:51:48'),(111,54,18,'download','2025-03-31 11:51:56'),(112,54,18,'download','2025-03-31 11:52:08'),(113,33,18,'download','2025-03-31 11:55:52'),(114,33,18,'download','2025-03-31 11:56:05'),(115,33,18,'download','2025-03-31 11:56:31'),(116,33,18,'download','2025-03-31 11:56:49'),(117,33,18,'download','2025-03-31 11:58:07'),(118,33,18,'download','2025-03-31 12:01:07'),(119,33,18,'download','2025-03-31 12:03:09'),(120,54,18,'download','2025-03-31 12:03:15'),(121,51,18,'download','2025-03-31 12:03:18'),(122,33,18,'download','2025-03-31 12:03:21'),(123,33,18,'download','2025-03-31 12:07:23'),(124,33,18,'download','2025-03-31 12:07:37'),(125,33,18,'download','2025-03-31 12:09:19'),(126,33,18,'download','2025-03-31 12:11:55'),(127,33,18,'download','2025-03-31 12:12:03'),(128,55,18,'download','2025-03-31 12:12:34'),(129,55,18,'download','2025-03-31 12:12:43'),(130,54,18,'download','2025-03-31 12:16:10'),(131,54,18,'download','2025-03-31 12:16:20'),(132,55,18,'download','2025-03-31 12:16:25'),(133,56,18,'download','2025-03-31 12:17:08'),(134,56,18,'download','2025-03-31 12:17:12'),(135,56,18,'download','2025-03-31 12:17:49'),(136,56,18,'download','2025-03-31 12:20:37'),(137,56,18,'download','2025-03-31 12:23:24'),(138,56,18,'download','2025-03-31 12:24:05');
/*!40000 ALTER TABLE `document_statistics` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=270 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_tag_relations`
--

LOCK TABLES `document_tag_relations` WRITE;
/*!40000 ALTER TABLE `document_tag_relations` DISABLE KEYS */;
INSERT INTO `document_tag_relations` VALUES (1,36,1,6,'2025-03-24 16:51:39'),(2,38,12,6,'2025-03-24 16:54:05'),(3,38,6,6,'2025-03-24 16:54:05'),(4,38,3,6,'2025-03-24 16:54:05'),(20,40,5,6,'2025-03-25 14:45:48'),(21,40,9,6,'2025-03-25 14:45:48'),(22,40,10,6,'2025-03-25 14:45:48'),(23,40,13,6,'2025-03-25 14:45:48'),(24,40,14,6,'2025-03-25 14:45:48'),(29,39,1,6,'2025-03-25 15:21:29'),(30,39,6,6,'2025-03-25 15:21:29'),(31,39,7,6,'2025-03-25 15:21:29'),(39,41,6,6,'2025-03-25 16:00:33'),(40,41,16,6,'2025-03-25 16:00:33'),(45,42,6,6,'2025-03-25 16:37:02'),(46,42,17,6,'2025-03-25 16:37:02'),(72,43,3,6,'2025-03-26 11:14:16'),(73,43,15,6,'2025-03-26 11:14:16'),(74,43,18,6,'2025-03-26 11:14:16'),(96,44,17,6,'2025-03-26 13:39:05'),(97,44,18,6,'2025-03-26 13:39:05'),(98,44,20,6,'2025-03-26 13:39:05'),(99,44,10,6,'2025-03-26 13:39:05'),(158,46,15,6,'2025-03-27 09:53:55'),(159,46,6,6,'2025-03-27 09:53:55'),(160,46,9,6,'2025-03-27 09:53:55'),(161,47,13,6,'2025-03-27 11:32:49'),(162,47,6,6,'2025-03-27 11:32:49'),(163,47,15,6,'2025-03-27 11:32:49'),(164,48,11,6,'2025-03-27 16:35:16'),(165,48,15,6,'2025-03-27 16:35:16'),(166,48,9,6,'2025-03-27 16:35:16'),(167,48,5,6,'2025-03-27 16:35:16'),(168,45,17,6,'2025-03-28 09:09:12'),(169,45,21,6,'2025-03-28 09:09:12'),(170,45,22,6,'2025-03-28 09:09:12'),(177,50,13,14,'2025-03-28 14:56:42'),(178,50,15,14,'2025-03-28 14:56:42'),(179,50,6,14,'2025-03-28 14:56:42'),(180,49,13,6,'2025-03-31 10:09:54'),(181,49,21,6,'2025-03-31 10:09:54'),(188,51,9,18,'2025-03-31 12:21:00'),(189,51,15,18,'2025-03-31 12:21:00'),(190,51,23,18,'2025-03-31 12:21:00'),(194,52,6,6,'2025-03-31 13:10:58'),(195,52,9,6,'2025-03-31 13:10:58'),(196,52,24,6,'2025-03-31 13:10:58'),(197,53,17,19,'2025-03-31 13:47:33'),(198,53,6,19,'2025-03-31 13:47:33'),(240,54,5,18,'2025-03-31 14:52:29'),(241,54,6,18,'2025-03-31 14:52:29'),(242,54,28,18,'2025-03-31 14:52:29'),(243,55,13,18,'2025-03-31 14:55:43'),(244,55,6,18,'2025-03-31 14:55:43'),(245,55,15,18,'2025-03-31 14:55:43'),(246,55,9,18,'2025-03-31 14:55:43'),(250,33,13,18,'2025-03-31 15:12:24'),(251,33,15,18,'2025-03-31 15:12:24'),(252,33,9,18,'2025-03-31 15:12:24'),(268,56,5,18,'2025-03-31 15:23:37'),(269,56,15,18,'2025-03-31 15:23:37');
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
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_tags`
--

LOCK TABLES `document_tags` WRITE;
/*!40000 ALTER TABLE `document_tags` DISABLE KEYS */;
INSERT INTO `document_tags` VALUES (1,'Important',NULL,1,0),(2,'Urgent',NULL,1,0),(3,'Draft',NULL,1,1),(4,'Final',NULL,1,0),(5,'Archived',NULL,1,6),(6,'Educational',6,0,12),(7,'Yok',6,0,0),(8,'Lex',6,0,0),(9,'Animation',6,0,11),(10,'AI',6,0,0),(11,'ff',6,0,1),(12,'Tag nou',6,0,3),(13,'<1mb',6,0,6),(14,'dd',6,0,0),(15,'New',6,0,11),(16,'EGG',6,0,0),(17,'SPC',6,0,4),(18,'DMS',6,0,0),(19,'Estella',6,0,0),(20,'FC',6,0,0),(21,'Math',6,0,3),(22,'SPB',6,0,0),(23,'TagNou',18,0,1),(24,'GG',6,0,1),(25,'ssss',18,0,0),(26,'sss',18,0,0),(27,'sssss',18,0,0),(28,'dddd',18,0,0);
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
  `type` varchar(50) DEFAULT NULL,
  `version_number` int NOT NULL,
  `change_summary` text,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_current` tinyint(1) DEFAULT '0',
  `is_archived` tinyint(1) DEFAULT '0',
  `archive_path` varchar(255) DEFAULT NULL,
  `archive_filename` varchar(255) DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_version`),
  KEY `id_document` (`id_document`),
  KEY `created_by` (`created_by`),
  KEY `archived_by` (`archived_by`),
  CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`),
  CONSTRAINT `document_versions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `document_versions_ibfk_3` FOREIGN KEY (`archived_by`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_versions`
--

LOCK TABLES `document_versions` WRITE;
/*!40000 ALTER TABLE `document_versions` DISABLE KEYS */;
INSERT INTO `document_versions` VALUES (1,35,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_FFFF_.pdf',NULL,1,'Initial version',6,'2025-03-24 15:28:04',1,0,NULL,NULL,NULL,NULL),(2,36,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/260KB.pdf',NULL,1,'Initial version',6,'2025-03-24 15:31:46',1,0,NULL,NULL,NULL,NULL),(3,37,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/_SmallPdf_Doc_.pdf',NULL,1,'Initial version',6,'2025-03-24 15:54:40',1,0,NULL,NULL,NULL,NULL),(4,38,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t4/Get_Started_With_Smallpdf.pdf',NULL,1,'Initial version',6,'2025-03-24 16:54:05',1,0,NULL,NULL,NULL,NULL),(5,39,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB.pdf',NULL,1,'Initial version',6,'2025-03-25 08:50:35',0,0,NULL,NULL,NULL,NULL),(6,40,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t2/800KB.pdf',NULL,1,'Initial version',6,'2025-03-25 14:17:02',0,0,NULL,NULL,NULL,NULL),(7,40,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default/800KB_v1742905074572.pdf',NULL,2,'',6,'2025-03-25 14:17:54',0,0,NULL,NULL,NULL,NULL),(8,39,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default/350KB_v1742905403099.pdf',NULL,2,'',6,'2025-03-25 14:23:23',0,0,NULL,NULL,NULL,NULL),(9,40,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default/800KB_v1742905074572_v1742906540484.pdf',NULL,3,'nou nou',6,'2025-03-25 14:42:20',0,0,NULL,NULL,NULL,NULL),(10,40,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default/800KB_v1742905074572_v1742906540484_v1742906748330.pdf',NULL,4,'ceva diferit',6,'2025-03-25 14:45:48',1,0,NULL,NULL,NULL,NULL),(11,39,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB_v1742905403099_v1742907999348.pdf',NULL,3,'',6,'2025-03-25 15:06:39',0,0,NULL,NULL,NULL,NULL),(12,39,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB_v1742905403099_v1742907999348_v1742908889881.pdf',NULL,4,'nu mai am',6,'2025-03-25 15:21:29',1,0,NULL,NULL,NULL,NULL),(13,41,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB.pdf',NULL,1,'Initial version',6,'2025-03-25 15:39:26',0,0,NULL,NULL,NULL,NULL),(14,41,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB_v1742910458786.pdf',NULL,2,'noutati',6,'2025-03-25 15:47:38',0,0,NULL,NULL,NULL,NULL),(15,41,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB_v1742910458786_v1742911233149.pdf',NULL,3,'nope',6,'2025-03-25 16:00:33',1,0,NULL,NULL,NULL,NULL),(16,42,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/PDF_TestPage.pdf',NULL,1,'Initial version',6,'2025-03-25 16:25:53',0,0,NULL,NULL,NULL,NULL),(17,42,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/PDF_TestPage_v1742913422882.pdf',NULL,2,'SA meraga',6,'2025-03-25 16:37:02',1,0,NULL,NULL,NULL,NULL),(18,43,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/1.5MB.pdf',NULL,1,'Initial version',6,'2025-03-26 10:20:09',0,0,NULL,NULL,NULL,NULL),(19,43,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/1.5MB_v1742977260311.pdf',NULL,2,'tipul documentului',6,'2025-03-26 10:21:00',0,0,NULL,NULL,NULL,NULL),(20,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/1.5MB_v1742977260311_v1742978121705.pdf',NULL,3,'',6,'2025-03-26 10:35:21',0,0,NULL,NULL,NULL,NULL),(21,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/1.5MB_v1742977260311_v1742978121705_v1742978440554.pdf',NULL,4,'',6,'2025-03-26 10:40:40',0,0,NULL,NULL,NULL,NULL),(22,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/1.5MB_v1742977260311_v1742978121705_v1742978440554_v1742978799049.pdf',NULL,5,'cateva schimbari mici',6,'2025-03-26 10:46:39',0,0,NULL,NULL,NULL,NULL),(23,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/1.5MB_v1742977260311_v1742978121705_v1742978440554_v1742978799049_v1742979252053.pdf',NULL,6,'Cateva modify',6,'2025-03-26 10:54:12',0,0,NULL,NULL,NULL,NULL),(24,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1742979488981.NNOU',NULL,7,'nu multe',6,'2025-03-26 10:58:09',0,0,NULL,NULL,NULL,NULL),(25,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1742980173056.NNOU',NULL,8,'ih liba di',6,'2025-03-26 11:09:33',0,0,NULL,NULL,NULL,NULL),(26,43,'Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1742980455956.NNOU',NULL,9,'acum fucntioneaza?',6,'2025-03-26 11:14:15',1,0,NULL,NULL,NULL,NULL),(27,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/dummy.pdf',NULL,1,'Initial version',6,'2025-03-26 11:29:08',0,0,NULL,NULL,NULL,NULL),(28,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1742982374660.Nume Actual la Doc',NULL,2,'',6,'2025-03-26 11:46:14',0,0,NULL,NULL,NULL,NULL),(29,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1742982644423.Nume Actual la Doc',NULL,3,'idk',6,'2025-03-26 11:50:44',0,0,NULL,NULL,NULL,NULL),(30,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/800KB_v1742982847624.pdf',NULL,4,'numele',6,'2025-03-26 11:54:07',0,0,NULL,NULL,NULL,NULL),(31,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/260KB_v1742983252384.pdf',NULL,5,'nimic',6,'2025-03-26 12:00:52',0,0,NULL,NULL,NULL,NULL),(32,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB_v1742983550098.pdf',NULL,6,'idss',6,'2025-03-26 12:05:50',0,0,NULL,NULL,NULL,NULL),(33,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/412KB_v1742983670337.pdf',NULL,7,'asa sa fie ',6,'2025-03-26 12:07:50',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/Official Document','800KB_v7_archived.pdf',6,'2025-03-26 13:39:05'),(34,44,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_SmallPdf_Doc__v1742989145460.pdf',NULL,8,'am schimbat aicea',6,'2025-03-26 13:39:05',1,0,NULL,NULL,NULL,NULL),(35,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/_nume document_.pdf',NULL,1,'Initial version',6,'2025-03-26 15:23:18',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/t3','_v1_archived.pdf',6,'2025-03-26 15:24:55'),(36,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/800KB_v1742995495296.pdf',NULL,2,'AM SCHIMBAT FORMATUL',6,'2025-03-26 15:24:55',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/t3','_v2_archived.pdf',6,'2025-03-26 15:26:05'),(37,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/1.5MB_v1742995565983.pdf',NULL,3,'',6,'2025-03-26 15:26:06',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/t3','_v3_archived.pdf',6,'2025-03-26 16:39:59'),(38,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/_v1742999999537.STatistici',NULL,4,'',6,'2025-03-26 16:39:59',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/t3','_v4_archived.STatistici',6,'2025-03-26 16:41:46'),(39,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1743000106950.STatistici',NULL,5,'',6,'2025-03-26 16:41:46',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/Official Document','_v5_archived.STatistici',6,'2025-03-26 16:43:03'),(40,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t2/_v1743000183089.STatistici',NULL,6,'',6,'2025-03-26 16:43:03',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/t2','_v6_archived.STatistici',6,'2025-03-26 16:44:54'),(41,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_v1743000294435.STatistici',NULL,7,'',6,'2025-03-26 16:44:54',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/Official Document','_v7_archived.STatistici',6,'2025-03-26 16:46:06'),(42,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/_nume document__v1743000366741.pdf',NULL,8,'ceva',6,'2025-03-26 16:46:06',1,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/Official Document','_v8_archived.pdf',6,'2025-03-27 08:44:28'),(43,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/dummy_v1743057868085.pdf',NULL,9,'bb',6,'2025-03-27 08:44:28',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/Official Document','_v9_archived.pdf',6,'2025-03-27 08:45:01'),(44,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/350KB_v1743057901243.pdf',NULL,10,'cccc',6,'2025-03-27 08:45:01',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/t3','_v10_archived.pdf',6,'2025-03-28 09:09:12'),(45,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/10MB-TESTFILE.ORG_v1743058217352.pdf',NULL,11,'cv',6,'2025-03-27 08:50:17',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/Official Document','_v11_archived.pdf',6,'2025-03-27 09:01:24'),(46,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/_v1743058884462.STatistici',NULL,12,'fdff',6,'2025-03-27 09:01:24',0,1,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Archive/t3','_v12_archived.STatistici',6,'2025-03-27 09:19:41'),(47,45,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3/2mb_v1743059981050.pdf',NULL,13,'',6,'2025-03-27 09:19:41',0,0,NULL,NULL,NULL,NULL),(48,46,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/260KB.pdf',NULL,1,'Initial version',6,'2025-03-27 09:53:55',1,0,NULL,NULL,NULL,NULL),(49,47,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t2/800KB.pdf',NULL,1,'Initial version',6,'2025-03-27 11:32:49',1,0,NULL,NULL,NULL,NULL),(50,48,'/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document/260KB.pdf',NULL,1,'Initial version',6,'2025-03-27 16:35:16',1,0,NULL,NULL,NULL,NULL),(51,45,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t3/260KB_v1743145752853.pdf',NULL,14,'',6,'2025-03-28 09:09:12',0,0,NULL,NULL,NULL,NULL),(52,49,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/dummy.pdf',NULL,1,'Initial version',6,'2025-03-28 13:52:31',1,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v1_archived.pdf',6,'2025-03-31 10:09:54'),(53,49,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/260KB_v1743162801681.pdf',NULL,2,'cate ceva',6,'2025-03-28 13:53:21',0,0,NULL,NULL,NULL,NULL),(54,50,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t2/260KB.pdf',NULL,1,'Initial version',14,'2025-03-28 14:56:42',1,0,NULL,NULL,NULL,NULL),(55,49,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_TestPdf__v1743404994692.pdf',NULL,3,'cate cvv',6,'2025-03-31 10:09:54',0,0,NULL,NULL,NULL,NULL),(56,51,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t3/dummy.pdf',NULL,1,'Initial version',18,'2025-03-31 11:53:35',1,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/t3','_v1_archived.pdf',18,'2025-03-31 11:54:02'),(57,51,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v1743411242934.AndreiPdf',NULL,2,'tipul',18,'2025-03-31 11:54:02',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v2_archived.AndreiPdf',18,'2025-03-31 12:21:00'),(58,51,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/1.5MB_v1743412860349.pdf',NULL,3,'ffff',18,'2025-03-31 12:21:00',0,0,NULL,NULL,NULL,NULL),(59,52,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_NUme Onest_.pdf',NULL,1,'Initial version',6,'2025-03-31 13:10:21',1,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v1_archived.pdf',6,'2025-03-31 13:10:58'),(60,52,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_SmallPdf_Doc__v1743415858883.pdf',NULL,2,'cate ceav',6,'2025-03-31 13:10:58',0,0,NULL,NULL,NULL,NULL),(61,53,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t2/_FFFF_.pdf',NULL,1,'Initial version',19,'2025-03-31 13:47:33',1,0,NULL,NULL,NULL,NULL),(62,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v1_archived.pdf',NULL,1,'Initial version',18,'2025-03-31 13:54:43',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v1_archived.pdf',18,'2025-03-31 13:55:37'),(63,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/350KB_v1743418537036.pdf',NULL,2,'Scris mult aici',18,'2025-03-31 13:55:37',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v2_archived.pdf',18,'2025-03-31 13:55:48'),(64,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/350KB_v1743418548968.pdf',NULL,3,'Scris mult aici',18,'2025-03-31 13:55:48',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v3_archived.pdf',18,'2025-03-31 13:57:10'),(65,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v4_restored.pdf',NULL,4,'Scris mult aici',18,'2025-03-31 13:57:10',1,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v4_archived.pdf',18,'2025-03-31 15:15:55'),(66,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_nume document_ (1)_v1743418668193.pdf',NULL,5,'grafic',18,'2025-03-31 13:57:48',0,0,NULL,NULL,NULL,NULL),(67,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/412KB_v1743419231472.pdf',NULL,6,'nmk',18,'2025-03-31 14:07:11',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v6_archived.pdf',18,'2025-03-31 14:44:03'),(68,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v1743419266619.Comun',NULL,7,'ssss',18,'2025-03-31 14:07:46',0,0,NULL,NULL,NULL,NULL),(72,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_SmallPdf_Doc__v1743419879684.pdf',NULL,8,'ssss',18,'2025-03-31 14:17:59',0,0,NULL,NULL,NULL,NULL),(73,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v1743420268318.Comun',NULL,9,'ssss',18,'2025-03-31 14:24:28',0,0,NULL,NULL,NULL,NULL),(74,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v10_restored.pdf',NULL,10,'',18,'2025-03-31 14:26:52',1,0,NULL,NULL,NULL,NULL),(75,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_FFFFSSSSSD__v1743420535812.pdf',NULL,11,'',18,'2025-03-31 14:28:55',0,0,NULL,NULL,NULL,NULL),(76,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v12_restored.pdf',NULL,12,'Restored from archived version 10',18,'2025-03-31 14:47:12',1,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v12_archived.pdf',18,'2025-03-31 14:54:21'),(77,54,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v13_restored.pdf',NULL,13,'ddddd',18,'2025-03-31 14:52:29',1,0,NULL,NULL,NULL,NULL),(78,55,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_FFFF_.pdf',NULL,1,'Initial version',18,'2025-03-31 14:55:43',1,0,NULL,NULL,NULL,NULL),(79,33,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t3/_v1743423144636.nume document',NULL,1,'ssss',18,'2025-03-31 15:12:24',1,0,NULL,NULL,NULL,NULL),(80,56,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v1_restored.pdf',NULL,1,'Initial version',18,'2025-03-31 15:16:55',0,1,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Archive/Official Document','_v1_archived.pdf',18,'2025-03-31 15:22:55'),(81,56,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v2_restored.pdf',NULL,2,'modify',18,'2025-03-31 15:17:41',0,0,NULL,NULL,NULL,NULL),(82,56,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v3_restored.pdf',NULL,3,'schimbari masive',18,'2025-03-31 15:22:55',1,0,NULL,NULL,NULL,NULL),(83,56,'/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document/_v4_restored.pdf',NULL,4,'ffffff',18,'2025-03-31 15:23:37',1,0,NULL,NULL,NULL,NULL);
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
INSERT INTO `sessions` VALUES ('8BT8OhMzo2U-Nj5h3_T7qxJakpVb2Fs8',1743572886,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-04-01T13:58:51.943Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"id_user\":17,\"nom\":\"Admin\",\"prenom\":\"System\",\"role\":\"admin\"}');
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
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_document`
--

LOCK TABLES `table_document` WRITE;
/*!40000 ALTER TABLE `table_document` DISABLE KEYS */;
INSERT INTO `table_document` VALUES (1,'sample_report.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 10:55:52','This is a sample report','Annual Report 2024',1),(2,'business_plan.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 10:55:52','Business strategy plan','Business Plan 2024-2025',1),(3,'john_report.pdf','Official Document','./uploads/Official Document',6,'2025-03-21 11:03:53','Report for John','John Report 2024',1),(4,'shared_document.pdf','Official Document','./uploads/Official Document',14,'2025-03-21 11:04:34','Document shared with John','Shared Document 2024',1),(5,'shared_document.pdf','Shared Document','./uploads/Shared Document',1,'2025-03-21 11:18:49','Document shared with John','Shared Document 2024',1),(6,'hak.pdf','t1','./uploads/t1',6,'2025-03-21 12:34:00','Test hak document','hak.pdf',1),(7,'redaction_scientifique_.pdf','t2','./uploads/t2',6,'2025-03-21 14:08:34','mcmcmc','doc',1),(8,'redaction_scientifique_.pdf','t3','./uploads/t3',6,'2025-03-21 14:11:13','coms','aaa',1),(9,'file-sample_150kB.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 11:41:31','Comments','TestPdf',1),(10,'file-sample_150kB.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 11:53:32','Comentarii','Safir',1),(11,'pdf-test.pdf','t2','./uploads/t2',6,'2025-03-23 12:15:49','vvvvvv','TEstare',1),(12,'pdf-test.pdf','t4','./uploads/t4',6,'2025-03-23 12:23:00','caaa','ccaa',1),(13,'pdf-test.pdf','t3','./uploads/t3',6,'2025-03-23 12:26:42','ssss','fsfsf',1),(14,'fdfd.pdf','t3','./uploads/t3',6,'2025-03-23 12:36:23','DDDD','FFFF',1),(15,'pdf-test.pdf','t4','./uploads/t4',6,'2025-03-23 12:59:18','scacs','cc',1),(16,'1mb.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 13:54:12','Providing a sample PDF for educational or business use\r\nGet Started Now','File Content: Dummy Text (Sample PDF)',1),(17,'1mb.pdf','t3','./uploads/t3',6,'2025-03-23 14:30:53','Objective: This file is ideal for blank document needs, obtaining a new PDF file, testing file uploads','File Name TTT',1),(18,'pdf-test.pdf','t2','./uploads/t2',6,'2025-03-23 14:37:15','Yukon Department of Education\r\nBox 2703\r\nWhitehorse,Yukon\r\nCanada\r\nY1A 2C6\r\nPlease visit our website at: http://www.education.gov.yk.ca/','yoko',1),(19,'fdfd.pdf','Official Document','./uploads/Official Document',6,'2025-03-23 15:11:48','ate ac suscipit et, iaculis non est. Curabitur semper arcu ac ligula semper, nec luctus\r\nnisl blandit. Integer lacinia ante ac libero lobortis imperdiet.\r\nNullam mollis convallis ipsum,\r\nac accumsan nunc vehicula vitae. Nulla eget justo in felis tristique fringilla. Morbi sit amet\r\ntortor quis risus ','Lorem ipsum2',1),(20,'1mb.pdf','t4','./uploads/t4',14,'2025-03-23 15:52:31','xperimenting with PDF rendering and formatting in your applications\r\nProviding a sample PDF for educational or business use\r\nGet Started Now:\r\nWhether you\'re a','sample pdf file ',1),(21,'fdfd.pdf','Official Document','./uploads/Official Document',14,'2025-03-23 16:02:57','putate ac suscipit et, iaculis non est. Curabitur semper arcu ac ligula semper, nec luctus\r\nnisl blandit. Integer lacinia ante ac libero lobortis imperdiet.\r\nNullam mollis convallis ipsum,\r\nac accumsan nunc vehicula vitae. Nulla eget justo in felis tristique fringilla. Morbi sit amet\r\ntortor quis risus auctor condimentum. Morbi in ullamcorper elit. Nulla iaculis tellus sit amet\r\nmauris tempus fringilla.\r\nMaecenas mauris lectus, lobortis et','Lorem ipsum32323',1),(22,'1mb.pdf','t3','./uploads/t3',14,'2025-03-23 16:08:37','t in your testing and development projects. Simply click the download button to get started\r\nwith your sample PDF download!\r\nInformation About PDF Format\r\nPDF stands for Portable Document Format and was developed by Adobe Systems. It combines rich\r\ncontent such as text, images and hyperlinks, allowing users to share documents across different\r\noperating systems and devices with the same view. Its wide use has made it indispensable for\r\nelectronic document sharing. Thanks to its open-source readers and software, viewing and editing','File Content About PDF Format',1),(23,'fdfd.pdf','t3','./uploads/t3',14,'2025-03-23 16:14:19','. Maecenas sed egestas nulla, ac condimentum orci. Mauris diam felis,\r\nvulputate ac suscip','ipsum odio',1),(24,'10MB-TESTFILE.ORG.pdf','t3','./uploads/undefined',6,'2025-03-24 07:25:13','You will be recorded as the document author. Documents can be searched by author name.','TESTFILE.ORGG',1),(25,'2mb.pdf','Official Document','./uploads/undefined',6,'2025-03-24 08:28:42','xperimenting with PDF rendering and formatting in your applications\r\nProviding a sample PDF for educational or business use','2mb document',1),(26,'2mb.pdf','Official Document','./uploads/undefined',6,'2025-03-24 08:54:58','dsdsdsdsd','cccssssss',1),(27,'_TestPdf_.pdf','t2','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default',6,'2025-03-24 10:42:38','mulet comsssda','testing file',1),(28,'2mb.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default',6,'2025-03-24 10:47:43','afsddasfsdfdjsfdskjdsafkjdsnf','wwe',1),(29,'_TestPdf_.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 11:30:09','sem. Nullam at porttitor arcu, nec lacinia nisi. Ut ac dolor vitae odio interdum\r\ncondimentum. Vivamus dapibus sodales ex, vitae malesuada ipsum cursus\r\nconvallis. Maecenas sed egestas nulla, ac condimentum orci. Mauris diam felis,\r\nvulputate ac suscipit et, iaculis non est. Curabitur semper arcu ac ligula semper, nec luctus\r\nnisl blandit. Integer laci','GGWP2',1),(30,'_TestPdf_.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 11:36:22','. Maecenas sed egestas nulla, ac condimentum orci. Mauris diam felis,\r\nvulputate a','WWE2k2000',1),(31,'GGWPPasere','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 11:47:06','nisl blandit. Integer lacinia ante ac libero lobortis imperdiet.','GGWPPasere',1),(32,'Nume_Current','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 12:35:40','KSKDKSDSKDKD','Nume_Current',1),(33,'_v1743423144636.nume document','t3','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t3',6,'2025-03-24 12:40:03','comment','nume document',1),(34,'Get_Started_With_Smallpdf.pdf','t3','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3',6,'2025-03-24 12:54:36','Forget mundane administrative tasks. With','SmallPdf_Doc',1),(35,'_FFFF_.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 13:28:04','dsfdsfdsf','dsfdsfsdfdsf',1),(36,'260KB.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-24 13:31:46','fdsfsdfdsfsdf','NUme Onest',1),(37,'_SmallPdf_Doc_.pdf','t3','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t3',6,'2025-03-24 13:54:40','nonkeys','FFFFSSSSSD',1),(38,'Get_Started_With_Smallpdf.pdf','t4','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t4',6,'2025-03-24 14:54:05','nu am','HHHHHHHHHH',1),(39,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-25 06:50:35','Yyet to misery wisdom plenty polite to as. Prepared interest proposal it he exercise. My wishing an in attempt ferrars. Visited eat you why service looking engaged. At place no walls hopes rooms fully in. Roof hope shy tore leaf joy paid boy. Noisier out brought entered detract because sitting sir. Fat put occasion rendered off humanity has.','Documnet cu 350kb',1),(40,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf','t2','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/default',6,'2025-03-25 12:17:02','I had resolving otherwise she contented therefore. Afford relied warmth out sir hearts sister use garden. Men day warmth formed admire former simple. Humanity declared vicinity continue supplied no an. He hastened am no property exercise of. Dissimilar comparison no terminated devonshire no literature on. Say most yet head room such just easy.','Document 800kb',1),(41,'350KB_v1742910458786_v1742911233149.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-25 13:39:26','WEBbyothers. Two dear held mrs feet view her old fine. Bore can led than how has rank. Discovery any extensive has commanded direction. Short at front which blind as. Ye as procuring unwilling principle by.\r\n\r\nMuch evil soon high in hope do view. Out may few northward believing attempted. Yet timed being songs marry one defer men our. Although finished blessing do of. Consider speaking me prospect whatever if. Ten nearer rather hunted six parish indeed number. Allowance repulsive sex may contained can set suspected abilities cordially. Do part am he high rest that. So','Document de proba',1),(42,'PDF_TestPage_v1742913422882.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-25 14:25:53','Tnonono calm much most long me mean. Able rent long in do we. Uncommonly no it announcing melancholy an in. Mirth learn it he given. Secure shy favour length all twenty denote. He felicity no an at packages answered opinions juvenile.','SPBC',1),(43,'_v1742980455956.NNOU','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-26 08:20:09','testing,testtare.revo','NNOU',1),(44,'_SmallPdf_Doc__v1742989145460.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-26 09:29:08','ramprampramp','800KB.pdf',1),(45,'STatistici_v1743173110409.pdf','t3','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t3',6,'2025-03-26 13:23:17','NMD include instruirea utilizatorilor, iar faza finală constă în implementarea și punerea în producție a sistemului. Durata totală a contractului este de 12 luni, împărțită pe activități precise, cu termene specifice. În paralel, se va monitoriza progresul și se vor face ajustările necesare pentru a respecta termenele și cerințele stabilite. Fiecare activitate va fi susținută de resurse umane și tehnice corespunzătoare, iar echipa WEB WIN GROUP NET SRL va asigura implementarea completă și corectă a soluției.','STatistici',1),(46,'260KB.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-27 07:53:55',' sit amet massa vitae tortor condimentum. Viverra nibh cras pulvinar mattis nunc sed blandit\r\nlibero volutpat. Molestie a iaculis at erat pellentesque adipiscing commodo elit. Commodo quis\r\nimperdiet mas','Server',1),(47,'800KB.pdf','t2','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/t2',6,'2025-03-27 09:32:49','ugue cursus, tincidunt nisl a, aliquet lacus. Mauris rhoncus massa\r\nligula, in tristique tellus volutpat eu.\r\nPraesent blandit mauris mauris, eu mattis s','SSV',1),(48,'260KB.pdf','Official Document','/Users/pds/Desktop/Document_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-27 14:35:16','comss','Nume creativ',1),(49,'Astazi_v1743415742424.pdf','Official Document','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-28 11:52:31','comentariu','Astazi',1),(50,'260KB.pdf','t2','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t2',14,'2025-03-28 12:56:42','fdsfsdfsdfdsf','DE TEST',1),(51,'AndreiPdf_v1743412879118.pdf','Official Document','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document',18,'2025-03-31 08:53:35','Nu am comms','AndreiPdf',1),(52,'NewPDF_v1743415878434.pdf','Official Document','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document',6,'2025-03-31 10:10:21','comm','NewPDF',1),(53,'_FFFF_.pdf','t2','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/t2',19,'2025-03-31 10:47:33','ssss','NumeALex',1),(54,'_v13_restored.pdf','Official Document','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document',18,'2025-03-31 10:54:43','dddd','Comun',1),(55,'_FFFF_.pdf','Official Document','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document',18,'2025-03-31 11:55:43','nu am comm','curent',1),(56,'_v3_restored.pdf','Official Document','/Users/pds/Desktop/Test_App/EDMS-main/back-end/uploads/Official Document',18,'2025-03-31 12:16:54','noufsfsdfdsf','Document 31',1);
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
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_mot_cle`
--

LOCK TABLES `table_mot_cle` WRITE;
/*!40000 ALTER TABLE `table_mot_cle` DISABLE KEYS */;
INSERT INTO `table_mot_cle` VALUES (1,1,'annual','report','finance','summary','data'),(2,2,'strategy','business','planning','forecast','goals'),(3,3,'report','john','document','test','example'),(4,10,'Stats, lorem','','','',''),(5,11,'non, coress','','','',''),(6,12,'cc','','','',''),(7,13,'ssss','','','',''),(8,14,'ADdd','','','',''),(9,15,'sasc','','','',''),(10,16,'educational, business ','','','',''),(11,17,'developer, designer, content creator','','','',''),(12,18,'Whitehorse,Yukon','','','',''),(13,19,'Vivamus','','','',''),(14,20,'developer,designer','','','',''),(15,21,'Maecenas','','','',''),(16,22,'developer, designer','','','',''),(17,23,'varius','','','',''),(18,24,'TEst file','animation','','',''),(19,25,'Doc','Pdf file','adobe','',''),(20,26,'csdsss','','','',''),(21,27,'acum','aici','','',''),(22,28,'randy','','','',''),(23,29,'Nentodom','','','',''),(24,30,'Nunc','','','',''),(25,31,'nombre','estare','','',''),(26,32,'Nume','','','',''),(27,33,'keyword','','','',''),(28,34,'Digital','Enhance','','',''),(29,35,'fsdfdsf','','','',''),(30,36,'fdsfsdfdsfsd','','','',''),(31,37,'keys','','','',''),(32,38,'ce o fi','','','',''),(33,39,'442','am modificat','sep-atr','',''),(34,40,'700kb','lorem','nou','acum',''),(35,41,'test','eat','nombre','este',''),(36,42,'src','nom','nop','',''),(37,43,'document are area','haida','','',''),(38,44,'asta e cheie','parada','','',''),(39,45,'Statistics','Metrics','Stats','CCR',''),(40,46,'HHH','FFF','','',''),(41,47,'fff','','','',''),(42,48,'cc','fff','','',''),(43,49,'cheie','','','',''),(44,50,'ddd','','','',''),(45,51,'KeyeNoua','','','',''),(46,52,'key','','','',''),(47,53,'ddd','','','',''),(48,54,'ddd','','','',''),(49,55,'nume nou','','','',''),(50,56,'nou','nou','nou','','');
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
) ENGINE=InnoDB AUTO_INCREMENT=417 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_previlege`
--

LOCK TABLES `table_previlege` WRITE;
/*!40000 ALTER TABLE `table_previlege` DISABLE KEYS */;
INSERT INTO `table_previlege` VALUES (1,14,'sample_report.pdf',1,1,1,1),(2,15,'sample_report.pdf',1,1,1,1),(3,14,'business_plan.pdf',1,1,1,1),(4,15,'business_plan.pdf',1,0,1,0),(5,6,'john_report.pdf',1,1,1,1),(6,6,'shared_document.pdf',1,1,1,1),(7,6,'redaction_scientifique_.pdf',1,1,1,1),(8,6,'redaction_scientifique_.pdf',1,1,1,1),(9,6,'file-sample_150kB.pdf',1,1,1,1),(10,6,'file-sample_150kB.pdf',1,1,1,1),(11,6,'pdf-test.pdf',1,1,1,1),(12,6,'pdf-test.pdf',1,1,1,1),(13,6,'pdf-test.pdf',1,1,1,1),(14,6,'fdfd.pdf',1,1,1,1),(15,6,'pdf-test.pdf',1,1,1,1),(16,6,'1mb.pdf',1,1,1,1),(17,6,'1mb.pdf',1,1,1,1),(18,6,'pdf-test.pdf',1,1,1,1),(19,6,'fdfd.pdf',1,1,1,1),(20,14,'1mb.pdf',1,1,1,1),(21,14,'fdfd.pdf',1,1,1,1),(22,14,'1mb.pdf',1,1,1,1),(23,14,'fdfd.pdf',1,1,1,1),(24,6,'10MB-TESTFILE.ORG.pdf',1,1,1,1),(25,6,'2mb.pdf',1,1,1,1),(26,6,'2mb.pdf',1,1,1,1),(27,6,'_TestPdf_.pdf',1,1,1,1),(28,6,'2mb.pdf',1,1,1,1),(29,6,'_TestPdf_.pdf',1,1,1,1),(30,6,'_TestPdf_.pdf',1,1,1,1),(31,6,'GGWPPasere',1,1,1,1),(32,6,'Nume_Current',1,1,1,1),(33,6,'_v1743423144636.nume document',1,1,1,1),(34,6,'Get_Started_With_Smallpdf.pdf',1,1,1,1),(35,6,'_v1743423144636.nume document',1,1,1,1),(36,6,'260KB.pdf',1,1,1,1),(37,6,'_SmallPdf_Doc_.pdf',1,1,1,1),(38,6,'Get_Started_With_Smallpdf.pdf',1,1,1,1),(39,6,'350KB_v1742910458786_v1742911233149.pdf',1,1,1,1),(40,6,'800KB.pdf',1,1,1,1),(41,6,'350KB_v1742910458786_v1742911233149.pdf',1,1,1,1),(42,6,'PDF_TestPage_v1742913422882.pdf',1,1,1,1),(43,6,'_v1742980455956.NNOU',1,1,1,1),(44,6,'_SmallPdf_Doc__v1742989145460.pdf',1,1,1,1),(45,6,'STatistici_v1743173110409.pdf',1,1,1,1),(46,6,'260KB.pdf',1,1,1,1),(47,6,'800KB.pdf',1,1,1,1),(48,6,'260KB.pdf',1,1,1,1),(49,6,'Astazi_v1743415742424.pdf',1,1,1,1),(50,14,'260KB.pdf',1,1,1,1),(51,18,'sample_report.pdf',1,1,1,0),(52,18,'business_plan.pdf',1,1,1,0),(53,18,'john_report.pdf',1,1,1,0),(54,18,'shared_document.pdf',1,1,1,0),(55,18,'shared_document.pdf',1,1,1,0),(56,18,'hak.pdf',1,1,1,0),(57,18,'redaction_scientifique_.pdf',1,1,1,0),(58,18,'redaction_scientifique_.pdf',1,1,1,0),(59,18,'file-sample_150kB.pdf',1,1,1,0),(60,18,'file-sample_150kB.pdf',1,1,1,0),(61,18,'pdf-test.pdf',1,1,1,0),(62,18,'pdf-test.pdf',1,1,1,0),(63,18,'pdf-test.pdf',1,1,1,0),(64,18,'fdfd.pdf',1,1,1,0),(65,18,'pdf-test.pdf',1,1,1,0),(66,18,'1mb.pdf',1,1,1,0),(67,18,'1mb.pdf',1,1,1,0),(68,18,'pdf-test.pdf',1,1,1,0),(69,18,'fdfd.pdf',1,1,1,0),(70,18,'1mb.pdf',1,1,1,0),(71,18,'fdfd.pdf',1,1,1,0),(72,18,'1mb.pdf',1,1,1,0),(73,18,'fdfd.pdf',1,1,1,0),(74,18,'10MB-TESTFILE.ORG.pdf',1,1,1,0),(75,18,'2mb.pdf',1,1,1,0),(76,18,'2mb.pdf',1,1,1,0),(77,18,'_TestPdf_.pdf',1,1,1,0),(78,18,'2mb.pdf',1,1,1,0),(79,18,'_TestPdf_.pdf',1,1,1,0),(80,18,'_TestPdf_.pdf',1,1,1,0),(81,18,'GGWPPasere',1,1,1,0),(82,18,'Nume_Current',1,1,1,0),(83,18,'_v1743423144636.nume document',1,1,1,0),(84,18,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(85,18,'_v1743423144636.nume document',1,1,1,0),(86,18,'260KB.pdf',1,1,1,0),(87,18,'_SmallPdf_Doc_.pdf',1,1,1,0),(88,18,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(89,18,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',1,1,1,0),(90,18,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',1,1,1,0),(91,18,'350KB_v1742910458786_v1742911233149.pdf',1,1,1,0),(92,18,'PDF_TestPage_v1742913422882.pdf',1,1,1,0),(93,18,'_v1742980455956.NNOU',1,1,1,0),(94,18,'_SmallPdf_Doc__v1742989145460.pdf',1,1,1,0),(95,18,'STatistici_v1743173110409.pdf',1,1,1,0),(96,18,'260KB.pdf',1,1,1,0),(97,18,'800KB.pdf',1,1,1,0),(98,18,'260KB.pdf',1,1,1,0),(99,18,'Astazi_v1743415742424.pdf',1,1,1,0),(100,18,'260KB.pdf',1,1,1,0),(101,18,'sample_report.pdf',1,1,1,0),(102,18,'business_plan.pdf',1,1,1,0),(103,18,'john_report.pdf',1,1,1,0),(104,18,'shared_document.pdf',1,1,1,0),(105,18,'shared_document.pdf',1,1,1,0),(106,18,'hak.pdf',1,1,1,0),(107,18,'redaction_scientifique_.pdf',1,1,1,0),(108,18,'redaction_scientifique_.pdf',1,1,1,0),(109,18,'file-sample_150kB.pdf',1,1,1,0),(110,18,'file-sample_150kB.pdf',1,1,1,0),(111,18,'pdf-test.pdf',1,1,1,0),(112,18,'pdf-test.pdf',1,1,1,0),(113,18,'pdf-test.pdf',1,1,1,0),(114,18,'fdfd.pdf',1,1,1,0),(115,18,'pdf-test.pdf',1,1,1,0),(116,18,'1mb.pdf',1,1,1,0),(117,18,'1mb.pdf',1,1,1,0),(118,18,'pdf-test.pdf',1,1,1,0),(119,18,'fdfd.pdf',1,1,1,0),(120,18,'1mb.pdf',1,1,1,0),(121,18,'fdfd.pdf',1,1,1,0),(122,18,'1mb.pdf',1,1,1,0),(123,18,'fdfd.pdf',1,1,1,0),(124,18,'10MB-TESTFILE.ORG.pdf',1,1,1,0),(125,18,'2mb.pdf',1,1,1,0),(126,18,'2mb.pdf',1,1,1,0),(127,18,'_TestPdf_.pdf',1,1,1,0),(128,18,'2mb.pdf',1,1,1,0),(129,18,'_TestPdf_.pdf',1,1,1,0),(130,18,'_TestPdf_.pdf',1,1,1,0),(131,18,'GGWPPasere',1,1,1,0),(132,18,'Nume_Current',1,1,1,0),(133,18,'_v1743423144636.nume document',1,1,1,0),(134,18,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(135,18,'_v1743423144636.nume document',1,1,1,0),(136,18,'260KB.pdf',1,1,1,0),(137,18,'_SmallPdf_Doc_.pdf',1,1,1,0),(138,18,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(139,18,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',1,1,1,0),(140,18,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',1,1,1,0),(141,18,'350KB_v1742910458786_v1742911233149.pdf',1,1,1,0),(142,18,'PDF_TestPage_v1742913422882.pdf',1,1,1,0),(143,18,'_v1742980455956.NNOU',1,1,1,0),(144,18,'_SmallPdf_Doc__v1742989145460.pdf',1,1,1,0),(145,18,'STatistici_v1743173110409.pdf',1,1,1,0),(146,18,'260KB.pdf',1,1,1,0),(147,18,'800KB.pdf',1,1,1,0),(148,18,'260KB.pdf',1,1,1,0),(149,18,'Astazi_v1743415742424.pdf',1,1,1,0),(150,18,'260KB.pdf',1,1,1,0),(151,9,'sample_report.pdf',0,0,0,0),(152,9,'business_plan.pdf',0,0,0,0),(153,9,'john_report.pdf',0,0,0,0),(154,9,'shared_document.pdf',0,0,0,0),(155,9,'shared_document.pdf',0,0,0,0),(156,9,'hak.pdf',0,0,0,0),(157,9,'redaction_scientifique_.pdf',0,0,0,0),(158,9,'redaction_scientifique_.pdf',0,0,0,0),(159,9,'file-sample_150kB.pdf',0,0,0,0),(160,9,'file-sample_150kB.pdf',0,0,0,0),(161,9,'pdf-test.pdf',0,0,0,0),(162,9,'pdf-test.pdf',0,0,0,0),(163,9,'pdf-test.pdf',0,0,0,0),(164,9,'fdfd.pdf',0,0,0,0),(165,9,'pdf-test.pdf',0,0,0,0),(166,9,'1mb.pdf',0,0,0,0),(167,9,'1mb.pdf',0,0,0,0),(168,9,'pdf-test.pdf',0,0,0,0),(169,9,'fdfd.pdf',0,0,0,0),(170,9,'1mb.pdf',0,0,0,0),(171,9,'fdfd.pdf',0,0,0,0),(172,9,'1mb.pdf',0,0,0,0),(173,9,'fdfd.pdf',0,0,0,0),(174,9,'10MB-TESTFILE.ORG.pdf',0,0,0,0),(175,9,'2mb.pdf',0,0,0,0),(176,9,'2mb.pdf',0,0,0,0),(177,9,'_TestPdf_.pdf',0,0,0,0),(178,9,'2mb.pdf',0,0,0,0),(179,9,'_TestPdf_.pdf',0,0,0,0),(180,9,'_TestPdf_.pdf',0,0,0,0),(181,9,'GGWPPasere',0,0,0,0),(182,9,'Nume_Current',0,0,0,0),(183,9,'_v1743423144636.nume document',0,0,0,0),(184,9,'Get_Started_With_Smallpdf.pdf',0,0,0,0),(185,9,'_v1743423144636.nume document',0,0,0,0),(186,9,'260KB.pdf',0,0,0,0),(187,9,'_SmallPdf_Doc_.pdf',0,0,0,0),(188,9,'Get_Started_With_Smallpdf.pdf',0,0,0,0),(189,9,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',0,0,0,0),(190,9,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',0,0,0,0),(191,9,'350KB_v1742910458786_v1742911233149.pdf',0,0,0,0),(192,9,'PDF_TestPage_v1742913422882.pdf',0,0,0,0),(193,9,'_v1742980455956.NNOU',0,0,0,0),(194,9,'_SmallPdf_Doc__v1742989145460.pdf',0,0,0,0),(195,9,'STatistici_v1743173110409.pdf',0,0,0,0),(196,9,'260KB.pdf',0,0,0,0),(197,9,'800KB.pdf',0,0,0,0),(198,9,'260KB.pdf',0,0,0,0),(199,9,'Astazi_v1743415742424.pdf',0,0,0,0),(200,9,'260KB.pdf',0,0,0,0),(201,18,'sample_report.pdf',1,1,1,0),(202,18,'business_plan.pdf',1,1,1,0),(203,18,'john_report.pdf',1,1,1,0),(204,18,'shared_document.pdf',1,1,1,0),(205,18,'shared_document.pdf',1,1,1,0),(206,18,'hak.pdf',1,1,1,0),(207,18,'redaction_scientifique_.pdf',1,1,1,0),(208,18,'redaction_scientifique_.pdf',1,1,1,0),(209,18,'file-sample_150kB.pdf',1,1,1,0),(210,18,'file-sample_150kB.pdf',1,1,1,0),(211,18,'pdf-test.pdf',1,1,1,0),(212,18,'pdf-test.pdf',1,1,1,0),(213,18,'pdf-test.pdf',1,1,1,0),(214,18,'fdfd.pdf',1,1,1,0),(215,18,'pdf-test.pdf',1,1,1,0),(216,18,'1mb.pdf',1,1,1,0),(217,18,'1mb.pdf',1,1,1,0),(218,18,'pdf-test.pdf',1,1,1,0),(219,18,'fdfd.pdf',1,1,1,0),(220,18,'1mb.pdf',1,1,1,0),(221,18,'fdfd.pdf',1,1,1,0),(222,18,'1mb.pdf',1,1,1,0),(223,18,'fdfd.pdf',1,1,1,0),(224,18,'10MB-TESTFILE.ORG.pdf',1,1,1,0),(225,18,'2mb.pdf',1,1,1,0),(226,18,'2mb.pdf',1,1,1,0),(227,18,'_TestPdf_.pdf',1,1,1,0),(228,18,'2mb.pdf',1,1,1,0),(229,18,'_TestPdf_.pdf',1,1,1,0),(230,18,'_TestPdf_.pdf',1,1,1,0),(231,18,'GGWPPasere',1,1,1,0),(232,18,'Nume_Current',1,1,1,0),(233,18,'_v1743423144636.nume document',1,1,1,0),(234,18,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(235,18,'_v1743423144636.nume document',1,1,1,0),(236,18,'260KB.pdf',1,1,1,0),(237,18,'_SmallPdf_Doc_.pdf',1,1,1,0),(238,18,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(239,18,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',1,1,1,0),(240,18,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',1,1,1,0),(241,18,'350KB_v1742910458786_v1742911233149.pdf',1,1,1,0),(242,18,'PDF_TestPage_v1742913422882.pdf',1,1,1,0),(243,18,'_v1742980455956.NNOU',1,1,1,0),(244,18,'_SmallPdf_Doc__v1742989145460.pdf',1,1,1,0),(245,18,'STatistici_v1743173110409.pdf',1,1,1,0),(246,18,'260KB.pdf',1,1,1,0),(247,18,'800KB.pdf',1,1,1,0),(248,18,'260KB.pdf',1,1,1,0),(249,18,'Astazi_v1743415742424.pdf',1,1,1,0),(250,18,'260KB.pdf',1,1,1,0),(251,18,'AndreiPdf_v1743412879118.pdf',1,1,1,1),(252,6,'NewPDF_v1743415878434.pdf',1,1,1,1),(253,15,'sample_report.pdf',1,0,1,0),(254,15,'business_plan.pdf',1,0,1,0),(255,15,'john_report.pdf',1,0,1,0),(256,15,'shared_document.pdf',1,0,1,0),(257,15,'shared_document.pdf',1,0,1,0),(258,15,'hak.pdf',1,0,1,0),(259,15,'redaction_scientifique_.pdf',1,0,1,0),(260,15,'redaction_scientifique_.pdf',1,0,1,0),(261,15,'file-sample_150kB.pdf',1,0,1,0),(262,15,'file-sample_150kB.pdf',1,0,1,0),(263,15,'pdf-test.pdf',1,0,1,0),(264,15,'pdf-test.pdf',1,0,1,0),(265,15,'pdf-test.pdf',1,0,1,0),(266,15,'fdfd.pdf',1,0,1,0),(267,15,'pdf-test.pdf',1,0,1,0),(268,15,'1mb.pdf',1,0,1,0),(269,15,'1mb.pdf',1,0,1,0),(270,15,'pdf-test.pdf',1,0,1,0),(271,15,'fdfd.pdf',1,0,1,0),(272,15,'1mb.pdf',1,0,1,0),(273,15,'fdfd.pdf',1,0,1,0),(274,15,'1mb.pdf',1,0,1,0),(275,15,'fdfd.pdf',1,0,1,0),(276,15,'10MB-TESTFILE.ORG.pdf',1,0,1,0),(277,15,'2mb.pdf',1,0,1,0),(278,15,'2mb.pdf',1,0,1,0),(279,15,'_TestPdf_.pdf',1,0,1,0),(280,15,'2mb.pdf',1,0,1,0),(281,15,'_TestPdf_.pdf',1,0,1,0),(282,15,'_TestPdf_.pdf',1,0,1,0),(283,15,'GGWPPasere',1,0,1,0),(284,15,'Nume_Current',1,0,1,0),(285,15,'_v1743423144636.nume document',1,0,1,0),(286,15,'Get_Started_With_Smallpdf.pdf',1,0,1,0),(287,15,'_v1743423144636.nume document',1,0,1,0),(288,15,'260KB.pdf',1,0,1,0),(289,15,'_SmallPdf_Doc_.pdf',1,0,1,0),(290,15,'Get_Started_With_Smallpdf.pdf',1,0,1,0),(291,15,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',1,0,1,0),(292,15,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',1,0,1,0),(293,15,'350KB_v1742910458786_v1742911233149.pdf',1,0,1,0),(294,15,'PDF_TestPage_v1742913422882.pdf',1,0,1,0),(295,15,'_v1742980455956.NNOU',1,0,1,0),(296,15,'_SmallPdf_Doc__v1742989145460.pdf',1,0,1,0),(297,15,'STatistici_v1743173110409.pdf',1,0,1,0),(298,15,'260KB.pdf',1,0,1,0),(299,15,'800KB.pdf',1,0,1,0),(300,15,'260KB.pdf',1,0,1,0),(301,15,'Astazi_v1743415742424.pdf',1,0,1,0),(302,15,'260KB.pdf',1,0,1,0),(303,15,'AndreiPdf_v1743412879118.pdf',1,0,1,0),(304,15,'NewPDF_v1743415878434.pdf',1,0,1,0),(305,19,'sample_report.pdf',1,1,1,0),(306,19,'business_plan.pdf',1,1,1,0),(307,19,'john_report.pdf',1,1,1,0),(308,19,'shared_document.pdf',1,1,1,0),(309,19,'shared_document.pdf',1,1,1,0),(310,19,'hak.pdf',1,1,1,0),(311,19,'redaction_scientifique_.pdf',1,1,1,0),(312,19,'redaction_scientifique_.pdf',1,1,1,0),(313,19,'file-sample_150kB.pdf',1,1,1,0),(314,19,'file-sample_150kB.pdf',1,1,1,0),(315,19,'pdf-test.pdf',1,1,1,0),(316,19,'pdf-test.pdf',1,1,1,0),(317,19,'pdf-test.pdf',1,1,1,0),(318,19,'fdfd.pdf',1,1,1,0),(319,19,'pdf-test.pdf',1,1,1,0),(320,19,'1mb.pdf',1,1,1,0),(321,19,'1mb.pdf',1,1,1,0),(322,19,'pdf-test.pdf',1,1,1,0),(323,19,'fdfd.pdf',1,1,1,0),(324,19,'1mb.pdf',1,1,1,0),(325,19,'fdfd.pdf',1,1,1,0),(326,19,'1mb.pdf',1,1,1,0),(327,19,'fdfd.pdf',1,1,1,0),(328,19,'10MB-TESTFILE.ORG.pdf',1,1,1,0),(329,19,'2mb.pdf',1,1,1,0),(330,19,'2mb.pdf',1,1,1,0),(331,19,'_TestPdf_.pdf',1,1,1,0),(332,19,'2mb.pdf',1,1,1,0),(333,19,'_TestPdf_.pdf',1,1,1,0),(334,19,'_TestPdf_.pdf',1,1,1,0),(335,19,'GGWPPasere',1,1,1,0),(336,19,'Nume_Current',1,1,1,0),(337,19,'_v1743423144636.nume document',1,1,1,0),(338,19,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(339,19,'_v1743423144636.nume document',1,1,1,0),(340,19,'260KB.pdf',1,1,1,0),(341,19,'_SmallPdf_Doc_.pdf',1,1,1,0),(342,19,'Get_Started_With_Smallpdf.pdf',1,1,1,0),(343,19,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',1,1,1,0),(344,19,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',1,1,1,0),(345,19,'350KB_v1742910458786_v1742911233149.pdf',1,1,1,0),(346,19,'PDF_TestPage_v1742913422882.pdf',1,1,1,0),(347,19,'_v1742980455956.NNOU',1,1,1,0),(348,19,'_SmallPdf_Doc__v1742989145460.pdf',1,1,1,0),(349,19,'STatistici_v1743173110409.pdf',1,1,1,0),(350,19,'260KB.pdf',1,1,1,0),(351,19,'800KB.pdf',1,1,1,0),(352,19,'260KB.pdf',1,1,1,0),(353,19,'Astazi_v1743415742424.pdf',1,1,1,0),(354,19,'260KB.pdf',1,1,1,0),(355,19,'AndreiPdf_v1743412879118.pdf',1,1,1,0),(356,19,'NewPDF_v1743415878434.pdf',1,1,1,0),(357,19,'_v1743423144636.nume document',1,1,1,1),(358,18,'_v1_archived.pdf',1,1,1,1),(359,18,'_v1743423144636.nume document',1,1,1,1),(360,18,'350KB_v1743423461553.pdf',1,1,1,1),(361,15,'sample_report.pdf',1,0,1,0),(362,15,'business_plan.pdf',1,0,1,0),(363,15,'john_report.pdf',1,0,1,0),(364,15,'shared_document.pdf',1,0,1,0),(365,15,'shared_document.pdf',1,0,1,0),(366,15,'hak.pdf',1,0,1,0),(367,15,'redaction_scientifique_.pdf',1,0,1,0),(368,15,'redaction_scientifique_.pdf',1,0,1,0),(369,15,'file-sample_150kB.pdf',1,0,1,0),(370,15,'file-sample_150kB.pdf',1,0,1,0),(371,15,'pdf-test.pdf',1,0,1,0),(372,15,'pdf-test.pdf',1,0,1,0),(373,15,'pdf-test.pdf',1,0,1,0),(374,15,'fdfd.pdf',1,0,1,0),(375,15,'pdf-test.pdf',1,0,1,0),(376,15,'1mb.pdf',1,0,1,0),(377,15,'1mb.pdf',1,0,1,0),(378,15,'pdf-test.pdf',1,0,1,0),(379,15,'fdfd.pdf',1,0,1,0),(380,15,'1mb.pdf',1,0,1,0),(381,15,'fdfd.pdf',1,0,1,0),(382,15,'1mb.pdf',1,0,1,0),(383,15,'fdfd.pdf',1,0,1,0),(384,15,'10MB-TESTFILE.ORG.pdf',1,0,1,0),(385,15,'2mb.pdf',1,0,1,0),(386,15,'2mb.pdf',1,0,1,0),(387,15,'_TestPdf_.pdf',1,0,1,0),(388,15,'2mb.pdf',1,0,1,0),(389,15,'_TestPdf_.pdf',1,0,1,0),(390,15,'_TestPdf_.pdf',1,0,1,0),(391,15,'GGWPPasere',1,0,1,0),(392,15,'Nume_Current',1,0,1,0),(393,15,'_v1743423144636.nume document',1,0,1,0),(394,15,'Get_Started_With_Smallpdf.pdf',1,0,1,0),(395,15,'_FFFF_.pdf',1,0,1,0),(396,15,'260KB.pdf',1,0,1,0),(397,15,'_SmallPdf_Doc_.pdf',1,0,1,0),(398,15,'Get_Started_With_Smallpdf.pdf',1,0,1,0),(399,15,'350KB_v1742905403099_v1742907999348_v1742908889881.pdf',1,0,1,0),(400,15,'800KB_v1742905074572_v1742906540484_v1742906748330.pdf',1,0,1,0),(401,15,'350KB_v1742910458786_v1742911233149.pdf',1,0,1,0),(402,15,'PDF_TestPage_v1742913422882.pdf',1,0,1,0),(403,15,'_v1742980455956.NNOU',1,0,1,0),(404,15,'_SmallPdf_Doc__v1742989145460.pdf',1,0,1,0),(405,15,'STatistici_v1743173110409.pdf',1,0,1,0),(406,15,'260KB.pdf',1,0,1,0),(407,15,'800KB.pdf',1,0,1,0),(408,15,'260KB.pdf',1,0,1,0),(409,15,'Astazi_v1743415742424.pdf',1,0,1,0),(410,15,'260KB.pdf',1,0,1,0),(411,15,'AndreiPdf_v1743412879118.pdf',1,0,1,0),(412,15,'NewPDF_v1743415878434.pdf',1,0,1,0),(413,15,'_FFFF_.pdf',1,0,1,0),(414,15,'_v13_restored.pdf',1,0,1,0),(415,15,'_FFFF_.pdf',1,0,1,0),(416,15,'_v3_restored.pdf',1,0,1,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'Admin','System','admin@example.com','$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z',1,1,1,1,'admin',1,1),(2,'test','test2','test2@gmail.com','$2b$10$AzPXN0dFmDfe.YgwrepOa.ai2GksXyXtv45UkOK9nC//WRblZQ9Tm',1,1,0,1,'responsable',1,0),(3,'ccccc','dddd','cd@gmail.com','$2b$10$W5dsHBgUr0WSfjE./N0JZO33neqJgMoMdyOu/tdTu84BG3j9ooA5C',0,1,1,0,'user',1,0),(4,'John','Doe','john@example.com','b/GE9McQEPG',1,1,1,1,'user',1,1),(5,'Jane','Smith','jane@example.com','b/GE9McQEPG',0,0,0,0,'user',0,1),(6,'John','Doe','john.doe@example.com','$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,1,1,1,'user',1,1),(9,'dgfd','fdgdfgdfg','dfgdfg','$2b$10$4a.pin8oy84CxE27jKljBeXrFvMcYUUybZEyl52bXjk./5uAGcVya',0,0,0,0,'user',0,1),(14,'Alex','Smith','alex.smith@example.com','$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,1,1,1,'user',1,1),(15,'Maria','Garcia','maria.garcia@example.com','$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,0,1,1,'responsable',1,1),(17,'System','Admin','admin2@example.com','$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'admin',1,1),(18,'Andrei','Muncioiu','andrei@gmail.com','$2b$10$MwLz/ChGgUDSs7aX6FlofuOUYjidZ8TVcfXydBz2hkM4RZJXBQidm',1,1,1,1,'user',1,1),(19,'pasere','alex','alex@gmail.com','$2b$10$JciuKtaGhuWaHRKJuufHR.OWmmTaKlPSJTw8LibTLsMHk1fpt386i',1,1,1,1,'user',1,1);
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

-- Dump completed on 2025-04-01  8:49:34
