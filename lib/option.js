const stringUtils = require('./string-utils');
const {MYSQL_KEYWORDS} = require('./structure');

const CaseType = Object.freeze({UPPER: 'UPPER', LOWER: 'LOWER', PASCAL: 'PASCAL'});
const LiteralQuoteType = Object.freeze({ALWAYS: 'ALWAYS', NON_NUMERIC: 'NON_NUMERIC', INACTION: 'INACTION'});
const SchemaQuoteType = Object.freeze({ALWAYS: 'ALWAYS', RESERVED_WORD: 'RESERVED_WORD', INACTION: 'INACTION'});

const trimQuotes = (expression) => {
    for (let quote of ["'", '"', '`']) {
        if ((expression || '').startsWith(quote) && (expression || '').endsWith(quote)) {
            return expression.substring(1, expression.length - 1);
        }
    }
    return expression;
};

const ToStringOption = function() {
    this.case = CaseType.UPPER;
    this.literalQuote = LiteralQuoteType.INACTION;
    this.schemaQuote = SchemaQuoteType.INACTION;
    this.breakChar = '\n';
    this.selectExpressionSpacer = ' ';
    this.inClauseSpacer = '';
};
ToStringOption.prototype.processReservedWords = function(words) {
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
ToStringOption.prototype.processLiteral = function(literal) {
    if (this.literalQuote === LiteralQuoteType.INACTION) {
        return literal;
    }
    if (this.literalQuote === LiteralQuoteType.NON_NUMERIC) {
        const trimmed = trimQuotes(literal);
        if (stringUtils.isNumeric(trimmed)) {
            return trimmed;
        }
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
ToStringOption.prototype.processSchemaName = function(schemaName) {
    if (this.schemaQuote === SchemaQuoteType.INACTION) {
        return schemaName;
    }
    if (this.schemaQuote === SchemaQuoteType.RESERVED_WORD) {
        const trimmed = trimQuotes(schemaName) || '';
        if (MYSQL_KEYWORDS.indexOf(trimmed.toUpperCase()) === -1) {
            return trimmed;
        }
    }
    if (schemaName.endsWith(')')) {
        return schemaName;
    }
    if (schemaName.startsWith('`') && schemaName.endsWith('`')) {
        return schemaName;
    }
    return '`' + schemaName + '`';
};
ToStringOption.DEFAULT = new ToStringOption();

module.exports = {
    ToStringOption,
    CaseType,
    LiteralQuoteType,
    SchemaQuoteType
};
