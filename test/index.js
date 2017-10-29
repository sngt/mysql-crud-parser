#!/usr/bin/env node
'use strict';

const fs = require('fs');
const {Crud, StatementType} = require('../index.js');

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
