-- MySQL dump 10.13  Distrib 8.4.5, for macos13.7 (arm64)
--
-- Host: localhost    Database: PSPD
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `deleted_folders`
--
-- WHERE:  1=1

LOCK TABLES `deleted_folders` WRITE;
/*!40000 ALTER TABLE `deleted_folders` DISABLE KEYS */;
INSERT INTO `deleted_folders` (`id`, `folder_id`, `folder_name`, `folder_path`, `created_by`, `institution_id`, `is_private`, `created_at`, `deleted_by`, `deleted_at`) VALUES (81,NULL,'Clasificat','Scoala Dabuleni/Folder_SuperAdmin_2/Clasificat',NULL,NULL,0,'2025-05-29 11:06:12',NULL,'2025-05-29 11:06:12'),(150,NULL,'Jesus','Scoala Dabuleni/Jesus',25,3,1,'2025-06-09 21:37:22',25,'2025-06-09 21:37:22'),(151,NULL,'Muricia','Scoala Dabuleni/Muricia',25,3,1,'2025-06-09 21:37:28',25,'2025-06-09 21:37:28'),(155,NULL,'VOlei','Scoala Dabuleni/Estevao/FORDmondeo/VOlei',25,3,1,'2025-07-30 05:58:23',25,'2025-07-30 05:58:23'),(156,NULL,'kutrtr','Scoala Dabuleni/AlexFolder/AlexTypeTest/kutrtr',25,3,1,'2025-07-30 05:58:51',25,'2025-07-30 05:58:51'),(157,NULL,'FORD','Scoala Dabuleni/Estevao/FORD',25,3,1,'2025-07-30 05:59:05',25,'2025-07-30 05:59:05'),(162,NULL,'RATATA','Scoala Dabuleni/PRRRA/numaipentrutime/RATATA',25,3,1,'2025-08-04 13:42:01',25,'2025-08-04 13:42:01'),(164,NULL,'numaipentrutime','Scoala Dabuleni/PRRRA/numaipentrutime',25,3,1,'2025-08-04 13:48:47',25,'2025-08-04 13:48:47');
/*!40000 ALTER TABLE `deleted_folders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-23 21:43:00
