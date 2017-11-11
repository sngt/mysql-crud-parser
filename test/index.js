#!/usr/bin/env node
'use strict';

const fs = require('fs');
const {Crud, StatementType} = require('../index.js');

const assert = (isSuccess, errorMessage) => {
    if (isSuccess !== true) {
        throw Error(errorMessage);
    }
    console.log('passed.');
};

const assertEquals = (expected, actual) => {
    assert(expected === actual, `two values did not equal each other.:\n${actual}\n${expected}`);
};

fs.readFile('./test.sql', 'utf8', function (err, text) {
    if (err) {
        throw err;
    }
    const crud = new Crud(text);
    assertEquals(15, crud.statements.length);

    crud.expandSource();
    assertEquals(18, crud.statements.length);

    crud.statements.forEach((statement) => {
        console.log(statement.toString());
    });
});

(() => {
    const SQL = 'SELECT `val`, COUNT(1) FROM (SELECT COUNT(1) AS `val` FROM `tbl` WHERE `type` IN (1,2,3) GROUP BY `type`) `tmp` WHERE `id` IN (1,2,3,4);';
    const crud = new Crud(SQL);
    assertEquals(SQL, crud.statements.shift().toString());
})();
