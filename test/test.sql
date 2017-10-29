#Lines start with '#' or '-- ' would be treated as comments.
/*
Block comments start with '/*' are also supported.
*/
SELECT id, `name` FROM `user` WHERE id IN (1, 2)\G -- ';' and '\G' are both recognized as statement delimiters.
Delete From `user` Where id=1; #Reserved words are NOT case sensitive.
update `user` set name = 'scipio' where id = 2 and name in ('paullus', 'varro');

INSERT INTO `user` VALUES (3, 'hamilcar', 'a722c63db8ec8625af6cf71cb8c2d939');
INSERT INTO `user` (id, `name`, `password`) VALUE (4, 'hasdrubal', 'c1572d05424d0ecb2a65ec6a82aeacbf');
INSERT INTO `user` (id, `name`, `password`) VALUES
(5, 'mago', '3afc79b597f88a72528e864cf81856d2'),
(6, 'hannibal', '3afc79b597f88a72528e864cf81856d2');
REPLACE INTO `user` (id, `name`, `password`) VALUES (6, 'hannibal', 'fc2921d9057ac44e549efaf0048b2512');

SELECT * FROM `user` WHERE id = 3;
SELECT * FROM `user` WHERE id=4;

SOURCE /path/to/source.sql;
