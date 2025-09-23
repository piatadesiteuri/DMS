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
-- Dumping data for table `institutions`
--
-- WHERE:  1=1

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
INSERT INTO `institutions` (`id_institution`, `name`, `address`, `phone`, `email`, `created_at`, `updated_at`, `superadmin_id`, `stripe_customer_id`, `subscription_status`) VALUES (3,'Scoala Dabuleni','Strada Alexandru Vlahuță, Dăbuleni, Dolj, 207220, România','0745423475','scoladableni@gmail.com','2025-04-29 11:10:08','2025-04-29 11:35:36',20,NULL,'free'),(4,'Scoala Oarca','Sărata, Călărași, Dolj, 207171, România','0734254234','calarasi.school@gmail.com','2025-04-30 09:10:53','2025-04-30 09:10:54',27,NULL,'free'),(5,'Primaria Bradesti','Brădești, Zona Metropolitană Craiova, Dolj, România','07434343423','office@bradesti.com','2025-05-05 07:55:44','2025-05-05 07:55:45',30,NULL,'free'),(6,'Scoala OCR','Dăbuleni, Dolj, România','0742345721','primariaocr@gmail.com','2025-05-06 11:37:03','2025-05-06 11:37:03',31,NULL,'free'),(7,'OCR Dolj','Gorj, România','0747374723','ocrdolj@gmai.com','2025-05-06 11:43:34','2025-05-06 11:43:34',32,NULL,'free'),(8,'Demo Semnatura','45, Bulevardul Gheorghe Chițu, Ungureni, Craiova, Zona Metropolitană Craiova, Dolj, 200347, România','0768345453','demosemantura@gmail.com','2025-07-02 09:26:26','2025-07-02 09:26:26',36,NULL,'free');
/*!40000 ALTER TABLE `institutions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-23 21:42:28
