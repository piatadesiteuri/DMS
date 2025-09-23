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
-- Table structure for table `deleted_document_versions`
--

DROP TABLE IF EXISTS `deleted_document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_document_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_version` int DEFAULT NULL,
  `id_institution` int DEFAULT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version_number` int NOT NULL,
  `version_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_document_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_summary` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `keywords` json DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `metadata_changes` json DEFAULT NULL,
  `first_page` longtext COLLATE utf8mb4_unicode_ci,
  `file_size` bigint DEFAULT '0',
  `deleted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_document` (`id_document`),
  KEY `created_by` (`created_by`),
  KEY `type_id` (`type_id`),
  CONSTRAINT `deleted_document_versions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `deleted_document_versions_ibfk_3` FOREIGN KEY (`type_id`) REFERENCES `document_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_documents`
--

DROP TABLE IF EXISTS `deleted_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_documents` (
  `id_document` int NOT NULL AUTO_INCREMENT,
  `nom_document` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `type_id` int DEFAULT NULL,
  `date_upload` timestamp NULL DEFAULT NULL,
  `comment` text,
  `id_user_source` int DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_size` bigint DEFAULT '0',
  `first_page` longtext,
  `keywords` json DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `nom_document_original` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_document`)
) ENGINE=InnoDB AUTO_INCREMENT=1229 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_folders`
--

DROP TABLE IF EXISTS `deleted_folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_folders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folder_id` int DEFAULT NULL,
  `folder_name` varchar(255) NOT NULL,
  `folder_path` varchar(255) NOT NULL,
  `created_by` int DEFAULT NULL,
  `institution_id` int DEFAULT NULL,
  `is_private` tinyint DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_versions`
--

DROP TABLE IF EXISTS `deleted_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_versions` (
  `id_version` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_institution` int NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `version_number` int NOT NULL,
  `version_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` json DEFAULT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `original_document_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `change_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_current` tinyint(1) DEFAULT '0',
  `is_archived` tinyint(1) DEFAULT '0',
  `archive_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archive_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `type_id` int NOT NULL,
  `parent_version_id` int DEFAULT NULL,
  `diff_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `metadata_changes` json DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  `original_version_id` int DEFAULT NULL,
  PRIMARY KEY (`id_version`),
  KEY `id_document` (`id_document`),
  KEY `id_institution` (`id_institution`),
  KEY `created_by` (`created_by`),
  KEY `archived_by` (`archived_by`),
  KEY `type_id` (`type_id`),
  KEY `parent_version_id` (`parent_version_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_drafts`
--

DROP TABLE IF EXISTS `document_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_drafts` (
  `id_draft` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `document_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `keywords` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `selected_tags` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `folder_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_draft`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `document_drafts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_files`
--

DROP TABLE IF EXISTS `document_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_files` (
  `id_file` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_user` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size` bigint NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `date_upload` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_modified` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '1',
  `comment` text,
  PRIMARY KEY (`id_file`),
  KEY `id_document` (`id_document`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `document_files_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`),
  CONSTRAINT `document_files_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  UNIQUE KEY `unique_user_doc` (`user_id`,`nom_doc`),
  KEY `user_id` (`user_id`),
  KEY `idx_user_doc` (`user_id`,`nom_doc`),
  KEY `idx_last_opened` (`last_opened_at`),
  CONSTRAINT `document_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=776 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_signatures`
--

DROP TABLE IF EXISTS `document_signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_signatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `signature_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_id` int DEFAULT NULL,
  `document_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_role` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `signature_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_x` decimal(10,2) DEFAULT '50.00',
  `position_y` decimal(10,2) DEFAULT '50.00',
  `position_page` int DEFAULT '1',
  `signed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '0',
  `verification_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `signature_id` (`signature_id`),
  KEY `idx_document_signatures_document_id` (`document_id`),
  KEY `idx_document_signatures_document_path` (`document_path`),
  KEY `idx_document_signatures_user_id` (`user_id`),
  KEY `idx_document_signatures_signed_at` (`signed_at`),
  CONSTRAINT `document_signatures_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `action_type` enum('download','view','upload','delete') NOT NULL,
  `action_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_statistic`),
  KEY `id_document` (`id_document`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `document_statistics_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=1623 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_tag_relations`
--

DROP TABLE IF EXISTS `document_tag_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_tag_relations` (
  `id_relation` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_version` int DEFAULT NULL,
  `id_tag` int NOT NULL,
  `added_by` int NOT NULL,
  `added_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_relation`),
  UNIQUE KEY `id_document_id_tag` (`id_document`,`id_tag`),
  KEY `id_tag` (`id_tag`),
  KEY `added_by` (`added_by`),
  KEY `id_version` (`id_version`),
  CONSTRAINT `document_tag_relations_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`) ON DELETE CASCADE,
  CONSTRAINT `document_tag_relations_ibfk_2` FOREIGN KEY (`id_tag`) REFERENCES `document_tags` (`id_tag`) ON DELETE CASCADE,
  CONSTRAINT `document_tag_relations_ibfk_3` FOREIGN KEY (`added_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `document_tag_relations_ibfk_4` FOREIGN KEY (`id_version`) REFERENCES `document_versions` (`id_version`)
) ENGINE=InnoDB AUTO_INCREMENT=4552 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=454 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_types`
--

DROP TABLE IF EXISTS `document_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(255) NOT NULL,
  `description` text,
  `folder_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `institution_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_name` (`type_name`),
  KEY `institution_id` (`institution_id`),
  CONSTRAINT `document_types_ibfk_1` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id_institution`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_versions`
--

DROP TABLE IF EXISTS `document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_versions` (
  `id_version` int NOT NULL AUTO_INCREMENT,
  `id_document` int NOT NULL,
  `id_institution` int NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_page` longtext COLLATE utf8mb4_unicode_ci,
  `file_size` bigint DEFAULT NULL,
  `version_number` int NOT NULL,
  `version_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` json DEFAULT NULL,
  `keywords` json DEFAULT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `original_document_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `change_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_current` tinyint(1) DEFAULT '0',
  `is_archived` tinyint(1) DEFAULT '0',
  `archive_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archive_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `type_id` int NOT NULL,
  `parent_version_id` int DEFAULT NULL,
  `diff_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `metadata_changes` json DEFAULT NULL,
  PRIMARY KEY (`id_version`),
  KEY `id_document` (`id_document`),
  KEY `id_institution` (`id_institution`),
  KEY `created_by` (`created_by`),
  KEY `archived_by` (`archived_by`),
  KEY `type_id` (`type_id`),
  KEY `parent_version_id` (`parent_version_id`),
  CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`),
  CONSTRAINT `document_versions_ibfk_2` FOREIGN KEY (`id_institution`) REFERENCES `institutions` (`id_institution`),
  CONSTRAINT `document_versions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `document_versions_ibfk_4` FOREIGN KEY (`archived_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `document_versions_ibfk_5` FOREIGN KEY (`type_id`) REFERENCES `document_types` (`id`),
  CONSTRAINT `document_versions_ibfk_6` FOREIGN KEY (`parent_version_id`) REFERENCES `document_versions` (`id_version`)
) ENGINE=InnoDB AUTO_INCREMENT=643 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `features`
--

DROP TABLE IF EXISTS `features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `features` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `folders`
--

DROP TABLE IF EXISTS `folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `folders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folder_name` varchar(255) NOT NULL,
  `folder_path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `institution_id` int DEFAULT NULL,
  `is_private` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_folders_user` (`created_by`),
  KEY `institution_id` (`institution_id`),
  CONSTRAINT `fk_folders_user` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `folders_ibfk_1` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id_institution`)
) ENGINE=InnoDB AUTO_INCREMENT=343 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `institution_plans`
--

DROP TABLE IF EXISTS `institution_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institution_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institution_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `institution_id` (`institution_id`),
  CONSTRAINT `institution_plans_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`),
  CONSTRAINT `institution_plans_ibfk_2` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id_institution`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `institutions`
--

DROP TABLE IF EXISTS `institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institutions` (
  `id_institution` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `superadmin_id` int DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `subscription_status` enum('free','active','canceled','past_due') DEFAULT 'free',
  PRIMARY KEY (`id_institution`),
  KEY `superadmin_id` (`superadmin_id`),
  CONSTRAINT `institutions_ibfk_1` FOREIGN KEY (`superadmin_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_requests`
--

DROP TABLE IF EXISTS `notification_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_requests` (
  `id_request` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `request_type` enum('upload_request','storage_upgrade') NOT NULL,
  `current_usage` decimal(10,2) NOT NULL,
  `plan_limit` decimal(10,2) NOT NULL,
  `reason` text,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `superadmin_id` int DEFAULT NULL,
  PRIMARY KEY (`id_request`),
  KEY `user_id` (`user_id`),
  KEY `superadmin_id` (`superadmin_id`),
  CONSTRAINT `notification_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`),
  CONSTRAINT `notification_requests_ibfk_2` FOREIGN KEY (`superadmin_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plan_features`
--

DROP TABLE IF EXISTS `plan_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_features` (
  `plan_id` int NOT NULL,
  `feature_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`plan_id`,`feature_id`),
  KEY `feature_id` (`feature_id`),
  CONSTRAINT `plan_features_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plan_features_ibfk_2` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `storage_limit` bigint NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `max_files` int DEFAULT '0',
  `max_file_size` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `max_users` int DEFAULT '1',
  `plan_type` enum('free','starter','professional','enterprise') DEFAULT 'free',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `table_document`
--

DROP TABLE IF EXISTS `table_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_document` (
  `id_document` int NOT NULL AUTO_INCREMENT,
  `nom_document` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `id_user_source` int DEFAULT NULL,
  `date_upload` datetime DEFAULT CURRENT_TIMESTAMP,
  `comment` text,
  `nom_document_original` varchar(255) DEFAULT NULL,
  `isVerfied` tinyint(1) DEFAULT '1',
  `type_id` int NOT NULL,
  `file_size` bigint DEFAULT '0',
  `current_version_id` int DEFAULT NULL,
  `first_page` longtext,
  PRIMARY KEY (`id_document`),
  KEY `id_user_source` (`id_user_source`),
  KEY `type_id` (`type_id`),
  KEY `current_version_id` (`current_version_id`),
  CONSTRAINT `table_document_ibfk_1` FOREIGN KEY (`id_user_source`) REFERENCES `user` (`id_user`),
  CONSTRAINT `table_document_ibfk_2` FOREIGN KEY (`type_id`) REFERENCES `document_types` (`id`),
  CONSTRAINT `table_document_ibfk_3` FOREIGN KEY (`current_version_id`) REFERENCES `document_versions` (`id_version`)
) ENGINE=InnoDB AUTO_INCREMENT=1230 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_document_backup`
--

DROP TABLE IF EXISTS `table_document_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_document_backup` (
  `id_document` int NOT NULL DEFAULT '0',
  `nom_document` varchar(255) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `path` varchar(255) NOT NULL,
  `id_user_source` int DEFAULT NULL,
  `date_upload` datetime DEFAULT CURRENT_TIMESTAMP,
  `comment` text,
  `nom_document_original` varchar(255) DEFAULT NULL,
  `isVerfied` tinyint(1) DEFAULT '1',
  `type_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=2055 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=795 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `phone_number` varchar(20) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `diffuse` tinyint(1) DEFAULT '0',
  `upload` tinyint(1) DEFAULT '0',
  `download` tinyint(1) DEFAULT '0',
  `print` tinyint(1) DEFAULT '0',
  `roles` varchar(20) DEFAULT 'user',
  `accepted` tinyint(1) DEFAULT '0',
  `verified` tinyint(1) DEFAULT '0',
  `dropbox_token` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `current_plan_id` int DEFAULT NULL,
  `institution_id` int DEFAULT NULL,
  `personal_folder_name` varchar(255) DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `subscription_status` enum('free','active','canceled','past_due') DEFAULT 'free',
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `email` (`email`),
  KEY `created_by` (`created_by`),
  KEY `current_plan_id` (`current_plan_id`),
  KEY `institution_id` (`institution_id`),
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`),
  CONSTRAINT `user_ibfk_2` FOREIGN KEY (`current_plan_id`) REFERENCES `plans` (`id`),
  CONSTRAINT `user_ibfk_3` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id_institution`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_logs`
--

DROP TABLE IF EXISTS `user_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=1634 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-23 21:37:23
