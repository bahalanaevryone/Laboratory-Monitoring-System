ALTER TABLE `students`
  ADD COLUMN IF NOT EXISTS `course` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `year_level` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `section` char(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `profile_picture` varchar(255) DEFAULT NULL;

ALTER TABLE `instructors`
  ADD COLUMN IF NOT EXISTS `profile_picture` varchar(255) DEFAULT NULL;

ALTER TABLE `custodians`
  ADD COLUMN IF NOT EXISTS `profile_picture` varchar(255) DEFAULT NULL;

ALTER TABLE `instructors`
  DROP COLUMN IF EXISTS `course`,
  DROP COLUMN IF EXISTS `year_level`,
  DROP COLUMN IF EXISTS `section`;

ALTER TABLE `custodians`
  DROP COLUMN IF EXISTS `course`,
  DROP COLUMN IF EXISTS `year_level`,
  DROP COLUMN IF EXISTS `section`;

ALTER TABLE `monitoring`
  ADD COLUMN IF NOT EXISTS `course` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `year_level` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `section` char(1) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `monitoring_hidden_students` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `monitoring_id` int(11) NOT NULL,
  `users_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_monitoring_hidden_user` (`monitoring_id`, `users_id`),
  KEY `users_id` (`users_id`),
  CONSTRAINT `monitoring_hidden_students_monitoring_fk`
    FOREIGN KEY (`monitoring_id`) REFERENCES `monitoring` (`monitoring_id`) ON DELETE CASCADE,
  CONSTRAINT `monitoring_hidden_students_users_fk`
    FOREIGN KEY (`users_id`) REFERENCES `users` (`users_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELETE c FROM `custodians` c
JOIN `users` u ON u.users_id = c.users_id
WHERE u.email <> 'omscLaboratoryCustodian@gmail.com';

DELETE FROM `users`
WHERE role = 'custodian'
  AND email <> 'omscLaboratoryCustodian@gmail.com';

INSERT INTO `users` (`email`, `password`, `role`)
SELECT 'omscLaboratoryCustodian@gmail.com',
       '$2y$12$wTyoSrIkdcN6SWt2a33c9uAuypVDJH/k9X49T2vt2RMhnmQJ6xJ5O',
       'custodian'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'omscLaboratoryCustodian@gmail.com'
);

UPDATE `users`
SET `password` = '$2y$12$wTyoSrIkdcN6SWt2a33c9uAuypVDJH/k9X49T2vt2RMhnmQJ6xJ5O',
    `role` = 'custodian'
WHERE `email` = 'omscLaboratoryCustodian@gmail.com';

INSERT INTO `custodians` (`users_id`, `first_name`, `last_name`)
SELECT u.users_id, 'OMSC', 'Laboratory'
FROM `users` u
WHERE u.email = 'omscLaboratoryCustodian@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM `custodians` c WHERE c.users_id = u.users_id);

UPDATE `custodians` c
JOIN `users` u ON u.users_id = c.users_id
SET c.first_name = 'OMSC',
    c.last_name = 'Laboratory'
WHERE u.email = 'omscLaboratoryCustodian@gmail.com';
