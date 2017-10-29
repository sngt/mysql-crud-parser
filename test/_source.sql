# source SQL file may also contain any comment line.

SHOW CREATE TABLE `item`;

SELECT COUNT(*) FROM `item`;

UPDATE item SET updated_at = NOW() WHERE id = 1;
