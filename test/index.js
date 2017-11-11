#!/usr/bin/env node
'use strict';

const fs = require('fs');
const {Crud, StatementType} = require('../index.js');

const assert = (isSuccess, errorMessage) => {
    if (isSuccess !== true) {
        throw Error(errorMessage);
    }
};

const assertEquals = (expected, actual) => {
    assert(expected === actual, `"${actual}" does not equal "${expected}"`);
};

fs.readFile('./test.sql', 'utf8', function (err, text) {
    if (err) {
        throw err;
    }
    const crud = new Crud(text);
    crud.statements.forEach((statement) => {
        console.log(statement.toString());
        if (statement.type === StatementType.SOURCE) {
            console.log('-------------------------------- infile --------------------------------');
            statement.expand().forEach((infile) => {
                console.log(infile.toString());
            });
            console.log('//------------------------------ infile --------------------------------');
        }
    });
});

(() => {
    const SQL = 'SELECT `val`, COUNT(1) FROM (SELECT COUNT(1) AS `val` FROM `tbl` GROUP BY `type` IN(1,2,3)) `tmp` WHERE `id` IN (1,2,3,4);';
    const crud = new Crud(SQL);
    assertEquals(SQL, crud.toString());
})();
