'use strict';

const {Statement, StatementType} = require('./lib/statement');
const {Option, DelimiterType, CaseType, LiteralQuoteType, SchemaQuoteType} = require('./lib/option');

class CrudParser {
    constructor(sql) {
        this.origin = (typeof sql === 'string') && sql || '';
    }

    parse() {
        return new SqlHolder(Statement.resolve(this.origin));
    }
}

class SqlHolder {
    constructor(statements) {
        this.breakChar = '\n';
        this.option = new Option();
        this.statements = statements;
    }

    toString() {
        return this.statements.map((statement) => {
            if (typeof statement === 'string') {
                return statement;
            }
            return statement.toString(this.option) + this.breakChar;
        }).join('');
    }
}

module.exports = {
    CrudParser,
    StatementType,
    DelimiterType,
    CaseType,
    LiteralQuoteType,
    SchemaQuoteType
};
