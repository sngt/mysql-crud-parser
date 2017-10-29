#!/usr/bin/env node
'use strict';

const fs = require('fs');
const {CrudParser} = require('../index.js');

fs.readFile('./test.sql', 'utf8', function (err, text) {
    if (err) {
        throw err;
    }
    const result = new CrudParser(text).parse();
    result.statements.forEach((statement) => {
        console.log(statement.toString());
    });
});
