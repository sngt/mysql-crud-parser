const stringUtils = require('./string-utils');
const {MYSQL_KEYWORDS} = require('./structure');

const CaseType = Object.freeze({UPPER: 'UPPER', LOWER: 'LOWER', PASCAL: 'PASCAL'});
const LiteralQuoteType = Object.freeze({ALWAYS: 'ALWAYS', NON_NUMERIC: 'NON_NUMERIC', INACTION: 'INACTION'});
const SchemaQuoteType = Object.freeze({ALWAYS: 'ALWAYS', RESERVED_WORD: 'RESERVED_WORD', INACTION: 'INACTION'});

const Option = function () {
    this.breakChar = '\n';
    this.case = CaseType.UPPER;
    this.literalQuote = LiteralQuoteType.ALWAYS;
    this.schemaQuote = SchemaQuoteType.ALWAYS;
};
Option.prototype.processReservedWords = function (words) {
    return (words || '').split(/\s/).map((word) => {
        switch (this.case) {
            case CaseType.LOWER:
                return word.toLowerCase();
            case CaseType.PASCAL:
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            default:
                return word.toUpperCase();
        }
    }).join(' ');
}
Option.prototype.processLiteral = function (literal) {
    if (this.literalQuote === LiteralQuoteType.INACTION) {
        return literal;
    }
    if (this.literalQuote === LiteralQuoteType.NON_NUMERIC && stringUtils.isNumeric(literal)) {
        return literal;
    }
    if (literal.startsWith("'") && literal.endsWith("'")) {
        return literal;
    }
    if (literal.startsWith('"') && literal.endsWith('"')) {
        return literal;
    }
    if (literal.endsWith(')')) {
        return literal;
    }
    return `'${literal.replace("'", "''")}'`;
};
Option.prototype.processSchemaName = function(schemaName) {
    if (this.schemaQuote === SchemaQuoteType.INACTION) {
        return schemaName;
    }
    if (this.schemaQuote === SchemaQuoteType.RESERVED_WORD) {
        if (MYSQL_KEYWORDS.indexOf((schemaName || '').toUpperCase()) !== -1) {
            return schemaName;
        }
    }
    if (schemaName.endsWith(')')) {
        return schemaName;
    }
    if (schemaName.startsWith('`') &&  schemaName.endsWith('`')) {
        return schemaName;
    }
    return '`' + schemaName + '`';
};

Option.DEFAULT = new Option();

module.exports = {
    Option,
    CaseType,
    LiteralQuoteType,
    SchemaQuoteType
};
