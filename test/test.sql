#Lines start with '#' or '-- ' would be treated as comments.
/*
Block comments start with '/*' are also supported.
*/
SELECT id, name FROM `user` WHERE id IN (1, 2)\G -- ';' and '\G' are both recognized as statement delimiters.
Delete From `user` Where id=1; #Reserved words are NOT case sensitive.
update `user` set name = 'hannibal' where id = 2;

INSERT INTO `user` VALUES (3, 'hamilcar', 'a722c63db8ec8625af6cf71cb8c2d939');
INSERT INTO `user` (id, name, password) VALUE (4, 'hasdrubal', 'a722c63db8ec8625af6cf71cb8c2d939');
SELECT * FROM `user` WHERE id = 3;
SELECT * FROM `user` WHERE id=4;

SOURCE /path/to/source.sql;
