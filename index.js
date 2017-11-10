'use strict';

const {Statement, StatementType} = require('./lib/statement');
const {ToStringOption, CaseType, LiteralQuoteType, SchemaQuoteType} = require('./lib/option');

class Crud {
    constructor(sql) {
        this.option = new ToStringOption();
        this.statements = Statement.resolve(sql || '');
    }

    toString() {
        return this.statements.map((statement) => {
            if (typeof statement === 'string') {
                return statement;
            }
            return statement.toString(this.option) + this.option.breakChar;
        }, this).join('');
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
    ToStringOption,
    CaseType,
    LiteralQuoteType,
    SchemaQuoteType
};
