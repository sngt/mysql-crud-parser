#!/usr/bin/env node
'use strict';

const SQL = 'INSERT INTO `tbl_user` (`id`, `name`, `password`) VALUES (1, \'papyopapyo\', \'4528e6a7bb9341c36c425faf40ef32c3\');\n'
    + 'SELECT * FROM `tbl_user` WHERE id = 1\\G\n'
    + 'UPDATE `tbl_user` SET `password` = \'eeff5809b250d691acf3a8ff8f210bd9\' WHERE id = 1;\n'
    + 'DELETE FROM `tbl_user` WHERE `id` IN (1);\n'
    + 'SOURCE /path/to/file.sql;';

var {Crud} = require('../index.js');
var crud = new Crud(SQL);

console.log(JSON.stringify(crud, null, 2));

console.log('------------------------------');

console.log(crud.toString());

console.log('------------------------------');

var source = crud.statements.pop();
console.log(source.toString());

console.log('------------------------------');
source.filePath = '_source_example.sql';
console.log(source.expand());

console.log('------------------------------');
var crud = new Crud('SELECT id, name, `order` FROM `tbl` WHERE id IN (1,2,\'3\') OR name IN (\'george\', \'ronald\');');
console.log(crud.toString());
console.log('------------------------------');
var {ToStringOption, CaseType, LiteralQuoteType, SchemaQuoteType} = require('../index.js');
var option = new ToStringOption();
option.case = CaseType.PASCAL;
option.literalQuote = LiteralQuoteType.NON_NUMERIC;
option.schemaQuote = SchemaQuoteType.RESERVED_WORD;
option.selectExpressionSpacer = '';
option.inClauseSpacer = '\t';
crud.option = option;
console.log(crud.toString());
