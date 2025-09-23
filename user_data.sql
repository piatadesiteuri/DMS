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
-- Dumping data for table `user`
--
-- WHERE:  1=1

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` (`id_user`, `prenom`, `nom`, `email`, `phone_number`, `password`, `diffuse`, `upload`, `download`, `print`, `roles`, `accepted`, `verified`, `dropbox_token`, `created_by`, `current_plan_id`, `institution_id`, `personal_folder_name`, `stripe_customer_id`, `subscription_status`) VALUES (1,'Admin','System','admin@example.com',NULL,'$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z',1,1,1,1,'admin',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(2,'test','test2','test2@gmail.com',NULL,'$2b$10$AzPXN0dFmDfe.YgwrepOa.ai2GksXyXtv45UkOK9nC//WRblZQ9Tm',1,1,0,1,'responsable',1,0,NULL,20,1,NULL,NULL,NULL,'free'),(4,'John','Doe','john@example.com',NULL,'b/GE9McQEPG',1,1,1,1,'user',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(5,'Jane','Smith','jane@example.com',NULL,'b/GE9McQEPG',0,0,0,0,'user',0,1,NULL,20,1,NULL,NULL,NULL,'free'),(6,'John','Doe','john.doe@example.com',NULL,'$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',0,0,0,0,'user',1,1,NULL,20,2,3,NULL,NULL,'free'),(9,'dgfd','fdgdfgdfg','dfgdfg',NULL,'$2b$10$4a.pin8oy84CxE27jKljBeXrFvMcYUUybZEyl52bXjk./5uAGcVya',0,0,0,0,'user',0,1,NULL,20,1,NULL,NULL,NULL,'free'),(14,'Alex','Smith','alex.smith@example.com',NULL,'$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',1,1,1,1,'user',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(15,'Maria','Garcia','maria.garcia@example.com',NULL,'$2b$10$6Zi5tfLoct.dvZrjr78OL.1uHan9T/cX2v1.cDmrtueWOmRgB8JSq',0,0,1,1,'responsable',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(17,'System','Admin','admin2@example.com',NULL,'$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa',1,1,1,1,'admin',1,1,NULL,20,2,3,NULL,NULL,'free'),(18,'Andrei','Muncioiu','andrei@gmail.com',NULL,'$2b$10$MwLz/ChGgUDSs7aX6FlofuOUYjidZ8TVcfXydBz2hkM4RZJXBQidm',1,1,1,1,'user',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(19,'pasere','alex','alex@gmail.com',NULL,'$2b$10$JciuKtaGhuWaHRKJuufHR.OWmmTaKlPSJTw8LibTLsMHk1fpt386i',1,1,1,1,'user',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(20,'Super','Admin','superadmin@example.com',NULL,'$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'superadmin',1,1,NULL,NULL,2,3,NULL,NULL,'free'),(21,'Nume','Noua','nouemail@gmail.com','0745256534','$2b$10$uZEekpdmwvBZuY8Qr9x9e.X0n5dkWsdZRroK86KTJ/byfqIBzlaFC',0,0,0,0,'user',1,1,NULL,20,1,NULL,NULL,NULL,'free'),(22,'Dorel','Ivan','ivanDoru@gmail.com','0754234452','$2b$10$VfhygFvHg1K0Ig8hV3AmGOGkbcqbbEr6fAwVIyEKebF97OFsnfehG',1,1,1,1,'user',1,1,NULL,20,1,7,NULL,NULL,'free'),(23,'Director','System','director@example.com',NULL,'$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'director',1,1,NULL,NULL,NULL,NULL,NULL,NULL,'free'),(24,'Dabuleni','ADdmin','admin.dabuleni@gmail.com','0734525423','$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'superadmin',1,1,NULL,NULL,NULL,NULL,NULL,NULL,'free'),(25,'Raul','Rusescu','raulrusescu@gmail.com','0734342342','$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa',1,1,1,1,'user',1,1,NULL,20,2,3,NULL,NULL,'free'),(26,'Mihai','stoica','mihai.stoica@gmail.com','0743493942','$2b$10$SsMMwmTLB4qdldcipfETUuJ1MY4fePHl3mexOShzgPamUprPt0N9u',1,1,1,1,'user',1,1,NULL,NULL,2,3,NULL,NULL,'free'),(27,'Admin','Oarca','oarca.admin@gmail.com','0745423424','$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'superadmin',1,1,NULL,NULL,1,4,NULL,NULL,'free'),(28,'Andrew','Crazy','andrew.ptc@gmail.com','0734254456','$2b$10$Cg7P8cn.S5FxGgV5fpzS6eyS9zps7eiBAA8CFkyARAg1KjJH.vtXC',1,1,1,1,'admin',1,1,NULL,23,NULL,4,NULL,NULL,'free'),(29,'Test','Memorie','testmemorie@gmail.com','0743432423','$2b$10$y5KS64ZYujHAZfZ1KqIBqeETx5ULZhTXoI2qnd3.O0U4Or4VOmSa6',1,1,1,1,'user',1,1,NULL,23,NULL,4,NULL,NULL,'free'),(30,'Popescu','Ion','popescu@bradesti.ro','0767390168','$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'superadmin',1,1,NULL,NULL,1,5,NULL,NULL,'free'),(31,'SuperAdmin','OCR','ocrsuperadmin@gmail.com','0743456321','$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty',1,1,1,1,'superadmin',1,1,NULL,NULL,1,6,NULL,NULL,'free'),(32,'OCRDolj','Superadmin','ocrdoljsuperadmin@gmail.com','0767543567','$2b$10$0bwHplUV.3ZOrQzDBOxRAefdLEgLWXhkYLD5VgFagEBP2/46wztO.',1,1,1,1,'superadmin',1,1,NULL,NULL,NULL,7,NULL,NULL,'free'),(33,'Denis','Mitroi','mitroidenis@gmail.com','0745353457','$2b$10$E/zSaXHZ9u0iYSmL3.RLZuphRMTe2YJPbOewCOqC37MajXQ.HFRwS',1,1,1,1,'user',1,1,NULL,31,NULL,6,NULL,NULL,'free'),(34,'Test','USER','FFFF@example.com','0745454355','$2b$10$HkEK7WNZ0blZMpEKKLvg9uJdvR/PHwW8R1zCXbzO.bltap1SiWKjm',1,1,1,1,'user',1,1,NULL,31,NULL,6,NULL,NULL,'free'),(35,'George','Mihai','mihaigeorge@example.com','0767462843','$2b$10$a.SFjDLFBJBkabH3p7D3AucPjOACm/dNey4MPO6/EoBpzR04v4x7G',1,1,1,1,'admin',1,1,NULL,31,NULL,6,NULL,NULL,'free'),(36,NULL,NULL,'semanturadigitala@gmail.com',NULL,'User1234!',0,0,0,0,'superadmin',1,1,NULL,NULL,NULL,8,NULL,NULL,'free'),(37,'Alexandru','Popescu','alexandru.popescu@gmail.com','+40 721 123 456','$2b$10$siBimpbbSg.xkzrtAcCU0e4dcvTdOmgSBzufxeiM43ohhnHkDhx2C',1,1,1,1,'user',1,1,NULL,36,NULL,8,NULL,NULL,'free'),(38,'Maria','Ionescu','maria.ionescu@gmail.com','+40 722 234 567','$2b$10$idLuizyul.0whmhiB8VfpOt98.LHKJeCBZCf.QX6tRugKmgyxcj5a',1,1,1,1,'user',1,1,NULL,36,NULL,8,NULL,NULL,'free'),(39,'Andrei','Gheorghe','andrei.gheorghe@gmail.com','+40 723 345 678','$2b$10$ov.SQcKLDDZXpLdFs4d1BOi1XTIMjRNLXn/HGNI38lTSJdxhx3.eC',1,1,1,1,'user',1,1,NULL,36,NULL,8,NULL,NULL,'free'),(40,'Marius','Adol','marius@gmail.com',NULL,'$2b$10$87nJQdgPoLo80vP2cdRe1ean5RI.0AQD3wERzFuIvA.TctLZQ2SWC',1,1,1,1,'user',1,1,NULL,NULL,NULL,NULL,'MarusFolder',NULL,'free');
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

-- Dump completed on 2025-09-23 21:42:27
