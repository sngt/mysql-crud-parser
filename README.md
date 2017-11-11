# MySQL CRUD Parser
SQL parser for MySQL Syntax.

## Summary
* It supports CRUD (`INSERT`,`SELECT`,`UPDATE`,`DELETE`) statements.
* It can read external file via `SOURCE` statements.

## Installation
```
npm i mysql-crud-parser
```

## Usage
Instantiate a `Crud` object with SQL statements.
```
const SQL = 'INSERT INTO `tbl_user` (`id`, `name`, `password`) VALUES (1, \'papyopapyo\', \'4528e6a7bb9341c36c425faf40ef32c3\');\n'
    + 'SELECT * FROM `tbl_user` WHERE id = 1\\G\n'
    + 'UPDATE `tbl_user` SET `password` = \'eeff5809b250d691acf3a8ff8f210bd9\' WHERE id = 1;\n'
    + 'DELETE FROM `tbl_user` WHERE `id` IN (1);\n'
    + 'SOURCE /path/to/file.sql;';

var {Crud} = require('mysql-crud-parser');
var crud = new Crud(SQL);
```
The statements above are now parsed into structures.
```
console.log(JSON.stringify(crud.statements, null, 2));
```
__↓ ↓__
```
{
  "option": {
    "case": "UPPER",
    "literalQuote": "INACTION",
    "schemaQuote": "INACTION",
    "breakChar": "\n",
    "selectExpressionSpacer": " ",
    "inClauseSpacer": ""
  },
  "statements": [
    {
      "type": "INSERT",
      "terminator": ";",
      "table": "`tbl_user`",
      "cols": [
        "`id`",
        "`name`",
        "`password`"
      ],
      "valuesList": [
        [
          "1",
          "'papyopapyo'",
          "'4528e6a7bb9341c36c425faf40ef32c3'"
        ]
      ]
    },
    {
      "type": "SELECT",
      "terminator": "\\G",
      "cols": [
        {
          "prefixes": [],
          "value": "*"
        }
      ],
      "table": "`tbl_user`",
      "where": {
        "clauseName": "WHERE",
        "conditions": [
          {
            "col": "id",
            "operator": "=",
            "value": "1"
          }
        ]
      }
    },
    {
      "type": "UPDATE",
      "terminator": ";",
      "table": "`tbl_user`",
      "sets": {
        "`password`": "'eeff5809b250d691acf3a8ff8f210bd9'"
      },
      "where": {
        "clauseName": "WHERE",
        "conditions": [
          {
            "col": "id",
            "operator": "=",
            "value": "1"
          }
        ]
      }
    },
    {
      "type": "DELETE",
      "terminator": ";",
      "table": "`tbl_user`",
      "where": {
        "clauseName": "WHERE",
        "conditions": [
          {
            "col": "`id`",
            "operator": "IN",
            "value": [
              "1"
            ]
          }
        ]
      }
    },
    {
      "type": "SOURCE",
      "terminator": ";",
      "filePath": "/path/to/file.sql"
    }
  ]
}
```
To rebuild the SQL statements, call its `toString` function.
```
console.log(crud.toString());
```
__↓ ↓__
```
INSERT INTO `tbl_user`(`id`,`name`,`password`) VALUES ('1','papyopapyo','4528e6a7bb9341c36c425faf40ef32c3');
SELECT `*` FROM `tbl_user` WHERE `id` = 1\G
UPDATE `tbl_user` SET `password` = 'eeff5809b250d691acf3a8ff8f210bd9' WHERE `id` = 1;
DELETE FROM `tbl_user` WHERE `id` IN (1);
SOURCE /path/to/file.sql;
```
Each element of the `statements` property also has own `toString`.
```
var source = crud.statements.pop();
console.log(source.toString());
```
__↓ ↓__
```
SOURCE /path/to/file.sql;
```
Then, suppose the file '/path/to/file.sql' really exists and its content is like below.
```
# SQL file may contain any comment lines.
SELECT COUNT(*) FROM `item`;
```
The Source object can `expand` it.
```
console.log(source.expand());
```
__↓ ↓__
```
[ '# SQL file may contain any comment lines.\n',
  Select {
    type: 'SELECT',
    terminator: ';',
    cols: [ [Object] ],
    table: '`item`' } ]
```

## Options
The `option` property has some optional settings about behaviors of `toString` function.
* `case`  
default: `UPPER` (| `LOWER` | `PASCAL`)  
which case(upper or lower) is to be used for SQL keywords.

* `literalQuote`  
default: `INACTION` (| `ALWAYS` | `NON_NUMERIC`)  
when to quote literals.

* `schemaQuote`  
default: `INACTION` (| `ALWAYS` | `RESERVED_WORD`)  
when to quote schema expressions.

* `breakChar`  
default: `\n`  
breaking character for plural line statements such as bulk insert ones.

* `selectExpressionSpacer`  
default: a white space  
spacing character for align column names or expressions in `SELECT` clause.
* `inClauseSpacer`  
default: empty string  
spacing character for align values for `IN` clause in `WHERE` clause.

Default
```
var crud = new Crud('SELECT id, name, `order` FROM tbl WHERE id IN (1,2,3)');
console.log(crud.toString());
```
__↓ ↓__
```
SELECT id, name, `order` FROM `tbl` WHERE id IN (1,2,'3') OR name IN ('george','ronald');
```
Custom example
```
var {ToStringOption, CaseType, LiteralQuoteType, SchemaQuoteType} = require('mysql-crud-parser');

var option = new ToStringOption();
option.case = CaseType.PASCAL;
option.literalQuote = LiteralQuoteType.NON_NUMERIC;
option.schemaQuote = SchemaQuoteType.RESERVED_WORD;
option.selectExpressionSpacer = '';
option.inClauseSpacer = '\t';
crud.option = option;

console.log(crud.toString());
```
__↓ ↓__
```
Select id,`name`,`order` From tbl Where id In (1,	2,	3) Or `name` In ('george',	'ronald');
```
