'use strict';

const {Statement, StatementType} = require('./lib/statement');
const {Option, DelimiterType, CaseType, LiteralQuoteType, SchemaQuoteType} = require('./lib/option');

class Crud {
    constructor(sql) {
        this.breakChar = '\n';
        this.option = new Option();
        this.statements = Statement.resolve(sql || '');
    }

    toString() {
        return this.statements.map((statement) => {
            if (typeof statement === 'string') {
                return statement;
            }
            return statement.toString(this.option) + this.breakChar;
        }).join('');
    }

    expandSource() {
        const result = [];
        this.statements.forEach((statement) => {
            if (statement.type !== StatementType.SOURCE) {
                result.push(statement);
                return;
            }

            const expanded = statement.expand();
            if (expanded === statement) {
                result.push(statement);
                return;
            }

            expanded.forEach((infile) => {
                result.push(infile);
            });
        });
        this.statements = result;
    }
}

module.exports = {
    Crud,
    StatementType,
    DelimiterType,
    CaseType,
    LiteralQuoteType,
    SchemaQuoteType
};
