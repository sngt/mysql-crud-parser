'use strict';

const fs = require('fs');
const {ToStringOption} = require('./option');
const {Structure, StructureType, Tokens, TokenType} = require('./structure');
const stringUtils = require('./string-utils');

const StatementType = Object.freeze({
    SELECT: 'SELECT',
    INSERT: 'INSERT',
    REPLACE: 'REPLACE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    SOURCE: 'SOURCE',

    classify: (command) => {
        return StatementType[(command || '').toUpperCase()] || null;
    }
});

class Statement {
    constructor(tokens, type) {
        if (tokens.firstExpression().toUpperCase() !== type) {
            throw new Error('Not a ' + type + ' statement. : ' + tokens.stringify());
        }
        this.type = type;

        if ([';', '\\G'].indexOf(tokens.lastExpression()) !== -1) {
            this.terminator = tokens.lastExpression();
        } else {
            this.terminator = '';
        }
    }
}
Statement.resolve = (sql) => {
    const statements = [];

    let tokenBuffer = [];
    const structures = Structure.resolve(sql);
    structures.forEach((structure, i) => {
        if (structure.type === StructureType.COMMENT) {
            statements.push(structure.content);
            return;
        }

        const token = structure.content;
        tokenBuffer.push(token);
        if (token.type === TokenType.DELIMITER || i === structures.length - 1) {
            statements.push(createStatementByTokens(new Tokens(tokenBuffer)));
            tokenBuffer = [];
        }
    });
    return statements;
};
const createStatementByTokens = (tokens) => {
    const type = StatementType.classify(tokens.firstExpression());
    switch (type) {
        case StatementType.SELECT:
            return new Select(tokens);
        case StatementType.INSERT:
            return new Insert(tokens);
        case StatementType.REPLACE:
            return new Replace(tokens);
        case StatementType.UPDATE:
            return new Update(tokens);
        case StatementType.DELETE:
            return new Delete(tokens);
        case StatementType.SOURCE:
            return new Source(tokens);
        default:
            return tokens.stringify();
    }
};

// @see https://dev.mysql.com/doc/refman/5.7/en/select.html
// TODO Support JOIN, UNION.
// TODO Support PARTITION, PROCEDURE, INTO OUTFILE, FOR UPDATE, LOCK IN SHARE MODE.
class Select extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.SELECT);
        tokens = tokens.clone().trimDelimiters();

        tokens.shift(); // SELECT

        const cols = [];
        const exprBufferTokens = new Tokens();
        const colsTokens = tokens.shiftUntilExpressionPattern(/^FROM$/i);
        this.cols = colsTokens.splitByExpressionPattern(/^,$/).map((colTokens) => {
            exprBufferTokens.merge(colTokens);
            if (exprBufferTokens.isParenthesisMismatched()) {
                return;
            }
            cols.push(new SelectExpression(exprBufferTokens));
            exprBufferTokens.clear();
        });
        this.cols = cols;

        if (tokens.firstExpression().toUpperCase() !== 'FROM') {
            return;
        }
        tokens.shift(); // FROM

        if (tokens.firstExpression() === '(') {
            const fromTokens = tokens.shiftParenthesisBlock().trimParenthesis();
            if (fromTokens.firstExpression().toUpperCase() === 'SELECT') {
                this.subFrom = new Select(fromTokens);
            } else {
                this.table = fromTokens.stringify();
            }
        }
        if (typeof this.table !== 'string') {
            if (TokenType.mayBeSchema(tokens.firstType()) !== true) {
                throw new Error('You have an error in your SELECT SQL syntax near "' + tokens.stringify() + '".');
            }
            this.table = tokens.shift().expression;
        }

        if (tokens.firstExpression().toUpperCase() === 'WHERE') {
            let whereTokens = tokens.shiftUntilExpressionPattern(/^(GROUP|HAVING|ORDER|LIMIT)$/i);
            if (whereTokens.isEmpty()) {
                whereTokens = tokens;
                tokens = new Tokens();
            }
            this.where = new Where(whereTokens);
        }
        if (tokens.firstExpression().toUpperCase() === 'GROUP') {// TODO Support ASC|DESC, WITH ROLLUP.
            tokens.shift(); // GROUP
            if (tokens.firstExpression().toUpperCase() !== 'BY') {
                throw new Error('You have an error in your SELECT SQL syntax near "' + tokens.stringify() + '".');
            }
            tokens.shift(); // BY
            let groupsTokens = tokens.shiftUntilExpressionPattern(/^(HAVING|ORDER|LIMIT)$/i);
            if (groupsTokens.isEmpty()) {
                groupsTokens = tokens;
                tokens = new Tokens();
            }
            this.group = groupsTokens.splitByExpressionPattern(/^,$/).map((groupTokens) => {
                if (groupTokens.lastExpression() === ',') {
                    groupTokens.pop();
                }
                return groupTokens.stringify();
            });
        }
        if (tokens.firstExpression().toUpperCase() === 'HAVING') {
            let havingTokens = tokens.shiftUntilExpressionPattern(/^(ORDER|LIMIT)$/i);
            if (havingTokens.isEmpty()) {
                havingTokens = tokens;
                tokens = new Tokens();
            }
            this.having = new Having(havingTokens);
        }
        if (tokens.firstExpression().toUpperCase() === 'ORDER') {// TODO Support ASC|DESC.
            tokens.shift(); // ORDER
            if (tokens.firstExpression().toUpperCase() !== 'BY') {
                throw new Error('You have an error in your SELECT SQL syntax near "' + tokens.stringify() + '".');
            }
            tokens.shift(); // BY
            let ordersTokens = tokens.shiftUntilExpressionPattern(/^LIMIT$/i);
            if (ordersTokens.isEmpty()) {
                ordersTokens = tokens;
                tokens = new Tokens();
            }
            this.order = ordersTokens.splitByExpressionPattern(/^,$/).map((orderTokens) => {
                if (orderTokens.lastExpression() === ',') {
                    orderTokens.pop();
                }
                return orderTokens.stringify();
            });
        }
        if (tokens.firstExpression().toUpperCase() === 'LIMIT') {
            tokens.shift(); // LIMIT
            const offsetTokens = tokens.shiftUntilExpressionPattern(/^,/i);
            if (offsetTokens.hasEntry()) {
                this.offset = parseInt(offsetTokens.stringify());
                tokens.shift(); // ,
                this.limit = parseInt(tokens.stringify());
                return;
            }
            const limitTokens = tokens.shiftUntilExpressionPattern(/^OFFSET$/i);
            if (limitTokens.hasEntry()) {
                this.limit = parseInt(limitTokens.stringify());
                tokens.shift(); // OFFSET
                this.offset = parseInt(tokens.stringify());
                return;
            }
            this.limit = parseInt(tokens.stringify());
        }
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;

        let sql = option.processReservedWords('SELECT ') + this.cols.map((expression) => {
            return expression.toString(option);
        }).join(',' + option.selectExpressionSpacer);
        if (this.table) {
            sql += option.processReservedWords(' FROM ');
            if (this.subFrom) {
                sql += '(' + this.subFrom.toString() + ') ';
            }
            sql += option.processSchemaName(this.table);
        }
        if (this.where) {
            sql += ' ' + this.where.toString(option);
        }
        if (this.group) {
            sql += option.processReservedWords(' GROUP BY ') + this.group.map(option.processSchemaName).join(',');
        }
        if (this.having) {
            sql += ' ' + this.having.toString(option);
        }
        if (this.order) {
            sql += option.processReservedWords(' ORDER BY ') + this.order.map(option.processSchemaName).join(',');
        }
        if (typeof this.limit === 'number') {
            sql += option.processReservedWords(' LIMIT ') + this.limit;
            if (typeof this.offset === 'number') {
                sql += option.processReservedWords(' OFFSET ') + this.offset;
            }
        }
        return sql + this.terminator;
    }
}
class SelectExpression {
    constructor(tokens) {
        tokens = tokens.clone();

        const prefixes = [];
        const PREFIX_KEYWORD_PATTERN = /^(ALL|DISTINCT|DISTINCTROW|HIGH_PRIORITY|STRAIGHT_JOIN|SQL_SMALL_RESULT|SQL_BIG_RESULT|SQL_BUFFER_RESULT|SQL_CACHE|SQL_NO_CACHE|SQL_CALC_FOUND_ROWS)$/i;
        while (tokens.firstExpression().match(PREFIX_KEYWORD_PATTERN)) {
            prefixes.push(tokens.shift().expression);
        }
        this.prefixes = prefixes;

        if (tokens.lastExpression() !== ')' && tokens.list.length >= 2) {
            this.alias = tokens.pop().expression;
            if (tokens.lastExpression().toUpperCase() === 'AS') {
                tokens.pop();
                this.isUsingAs = true;
            }
        }
        this.value = tokens.stringify();
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;

        let expression = '';
        if (this.prefixes.length > 0) {
            expression += this.prefixes.map((prefix) => {
                return option.processReservedWords(prefix);
            }).join(' ') + ' ';
        }

        expression += option.processSchemaName(this.value);
        if (this.alias) {
            if (this.isUsingAs) {
                expression += option.processReservedWords(' AS');
            }
            expression += ' ' + option.processSchemaName(this.alias);
        }
        return expression;
    }
}

class Insert extends Statement {
    constructor(tokens, type) {
        super(tokens, type || StatementType.INSERT);
        if ([StatementType.INSERT, StatementType.REPLACE].indexOf(this.type) === -1) {
            throw new Error('Invalid statement type for INSERT. : ' + this.type);
        }
        tokens = tokens.clone().trimDelimiters();

        tokens.shift(); // INSERT
        tokens.shiftUntilExpressionPattern(/^INTO$/i);
        if (tokens.firstExpression().toUpperCase() !== 'INTO') {
            throw new Error('You have an error in your INSERT SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift(); // INTO

        if (TokenType.mayBeSchema(tokens.firstType()) !== true) {
            throw new Error('You have an error in your INSERT SQL syntax near "' + tokens.stringify() + '".');
        }
        this.table = tokens.shift().expression;

        const colsTokens = tokens.shiftUntilExpressionPattern(/^VALUES?$/i);
        if (colsTokens.hasEntry()) {
            if (colsTokens.firstExpression() !== '(' || colsTokens.lastExpression() !== ')') {
                throw new Error('You have an error in your INSERT SQL syntax near "' + colsTokens.stringify() + '".');
            }
            colsTokens.shift(); // (
            colsTokens.pop(); // )
            this.cols = colsTokens.splitByExpressionPattern(/^,$/).map((colTokens) => {
                return colTokens.stringify();
            });
        }

        if (/VALUES?/i.test(tokens.firstExpression()) !== true) {
            throw new Error('Failed to parse INSERT statement. : ' + tokens.stringify());
        }
        tokens.shift(); // VALUES

        let values = [];
        let valueBuffer = '';
        const valuesList = [];
        tokens.splitByExpressionPattern(/^,$/).forEach((valueTokens) => {
            if (values.length <= 0 && valueTokens.firstExpression() === '(') {
                valueTokens.shift();
            }
            valueBuffer += valueTokens.stringify();
            const openingParenthesisCount = stringUtils.countChar(valueBuffer, '(');
            const closingParenthesisCount = stringUtils.countChar(valueBuffer, ')');
            if (openingParenthesisCount > closingParenthesisCount) {
                return;
            }

            if (openingParenthesisCount === closingParenthesisCount) {
                values.push(valueBuffer);
                valueBuffer = '';
                return;
            }

            valueBuffer = valueBuffer.substring(0, valueBuffer.length - 1);
            values.push(valueBuffer);
            if (this.cols && this.cols.length > 0 && this.cols.length !== values.length) {
                throw new Error('Column count doesn\'t match value count at "' + values.join(',') + '"');
            }
            valuesList.push(values);
            values = [];
            valueBuffer = '';
        });
        this.valuesList = valuesList;
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;

        let sql = option.processReservedWords(this.type + ' INTO ') + option.processSchemaName(this.table);
        if (this.cols && this.cols.length > 0) {
            sql += '(' + this.cols.map(option.processSchemaName).join(',') + ')';
        }

        sql += option.processReservedWords(' VALUES');
        sql += this.valuesList.length > 1
            ? option.breakChar
            : ' ';

        return sql + this.valuesList.map((values) => {
            return '(' + values.map(option.processLiteral).join(',') + ')';
        }).join(',' + option.breakChar) + this.terminator;
    }
}

class Replace extends Insert {
    constructor(tokens) {
        super(tokens, StatementType.REPLACE);
    }
}

class Update extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.UPDATE);
        tokens = tokens.clone().trimDelimiters();

        tokens.shift(); // UPDATE
        if (TokenType.mayBeSchema(tokens.firstType()) !== true) {
            throw new Error('You have an error in your UPDATE SQL syntax near "' + tokens.stringify() + '".');
        }
        this.table = tokens.shift().expression;

        if (tokens.firstExpression().toUpperCase() !== 'SET') {
            throw new Error('You have an error in your UPDATE SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift();

        const sets = {};
        const setsTokens = tokens.shiftUntilExpressionPattern(/^WHERE$/i);
        setsTokens.splitByExpressionPattern(/^,$/).forEach((setTokens) => {
            const colTokens = setTokens.shiftUntilExpressionPattern(/^\=$/);
            if (colTokens.isEmpty()) {
                throw new Error('You have an error in your UPDATE SQL syntax near "' + setTokens.stringify() + '".');
            }
            setTokens.shift(); // =
            if (setTokens.isEmpty()) {
                throw new Error('You have an error in your UPDATE SQL syntax near "' + setsTokens.stringify() + '".');
            }
            sets[colTokens.stringify()] = setTokens.stringify();
        });
        this.sets = sets;

        if (tokens.hasEntry()) {
            this.where = new Where(tokens);
        }
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;

        let sql = option.processReservedWords('UPDATE ') + option.processSchemaName(this.table);

        let set = '';
        for (let col in this.sets) {
            if (this.sets.hasOwnProperty(col) !== true) {
                continue;
            }
            if (set) {
                set += ', ';
            }
            set += option.processSchemaName(col) + ' = ' + option.processLiteral(this.sets[col]);
        }
        sql += option.processReservedWords(' SET ') + set;

        if (this.where) {
            sql += ' ' + this.where.toString(option);
        }

        return sql + this.terminator;
    }
}

class Delete extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.DELETE);
        tokens = tokens.clone().trimDelimiters();

        tokens.shift(); // DELETE
        if (tokens.firstExpression().toUpperCase() !== 'FROM') {
            throw new Error('You have an error in your DELETE SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift(); // FROM

        if (TokenType.mayBeSchema(tokens.firstType()) !== true) {
            throw new Error('You have an error in your DELETE SQL syntax near "' + tokens.stringify() + '".');
        }
        this.table = tokens.shift().expression;

        if (tokens.isEmpty()) {
            return;
        }

        if (tokens.firstExpression().toUpperCase() !== 'WHERE') {
            throw new Error('You have an error in your DELETE SQL syntax near "' + tokens.stringify() + '".');
        }
        this.where = new Where(tokens);
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;

        let sql = option.processReservedWords('DELETE FROM ') + option.processSchemaName(this.table);
        if (this.where) {
            sql += ' ' + this.where.toString(option);
        }
        return sql + this.terminator;
    }
}

class Source extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.SOURCE);
        tokens = tokens.clone().trimDelimiters();

        tokens.shift(); // SOURCE
        this.filePath = tokens.list.map((token) => {
            return token.expression;
        }).join('');
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;
        return option.processReservedWords('SOURCE ') + this.filePath + this.terminator;
    }

    expand(encode) {
        if (fs.existsSync(this.filePath) !== true) {
            return this;
        }
        return Statement.resolve(fs.readFileSync(this.filePath, encode || 'utf8'));
    }
}

class WhereHavingAbstract {
    constructor(tokens, clauseName) {
        this.clauseName = clauseName || '';
        if (typeof tokens !== 'object' || tokens.isEmpty()) {
            this.conditions = [];
            return;
        }

        tokens = tokens.clone();
        if (tokens.firstExpression().toUpperCase() !== this.clauseName.toUpperCase()) {
            throw new Error('You have an error in your WHERE clause SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift(); // WHERE|HAVING

        const conditions = [];
        let tokensBuffer = new Tokens();
        tokens.splitByExpressionPattern(/^(AND|OR)$/i).forEach((conditionTokens) => {
            tokensBuffer.merge(conditionTokens);
            if (tokensBuffer.isParenthesisMismatched()) {
                return;
            }

            let andCount = tokensBuffer.countExpressionPattern(/^AND$/i);
            if (tokensBuffer.firstExpression().toUpperCase() === 'AND') {
                andCount--;
            }
            const betweenCount = tokensBuffer.countExpressionPattern(/^BETWEEN$/i);
            if (betweenCount > andCount) {
                return;
            }

            if (tokensBuffer.lastExpression().match(/^(AND|OR)$/i)) {
                const linkOperator = tokenBuffer.pop();
                conditions.push(new WhereCondition(tokensBuffer));
                tokensBuffer = new Tokens([linkOperator]);
            } else {
                conditions.push(new WhereCondition(tokensBuffer));
                tokensBuffer = new Tokens();
            }
        }, this);
        this.conditions = conditions;
    }

    toString(option) {
        if (this.conditions.length <= 0) {
            return '';
        }

        option = option || ToStringOption.DEFAULT;
        return option.processReservedWords(this.clauseName) + ' ' + this.conditions.map((condition) => {
            return condition.toString();
        }).join(' ');
    }
}
class Where extends WhereHavingAbstract {
    constructor(tokens) {
        super(tokens, 'WHERE');
    }
}
class Having extends WhereHavingAbstract {
    constructor(tokens) {
        super(tokens, 'HAVING');
    }
}
const WhereLinkType = Object.freeze({
    AND: 'AND',
    OR: 'OR',
    classify: (operator) => {
        return WhereLinkType[(operator || '').toUpperCase()] || null;
    }
});
// @see https://dev.mysql.com/doc/refman/5.7/en/comparison-operators.html
// TODO Support all operators above.
class WhereCondition {
    constructor(tokens) {
        const COMPARISON_OPERATORS_PATTERN = /^(<\=>|<\=|>\=|!\=|\=|<>|<|>|BETWEEN|NOT|IN|LIKE|IS)$/i;

        tokens = tokens.clone();
        if (tokens.firstExpression().match(/^(AND|OR)$/i)) {
            this.linkType = WhereLinkType.classify(tokens.shift());
        }

        const operatorParts = [];
        const colTokens = tokens.shiftUntilExpressionPattern(COMPARISON_OPERATORS_PATTERN);
        if (colTokens.hasEntry()) {
            this.col = colTokens.stringify();
            while (tokens.firstExpression().match(COMPARISON_OPERATORS_PATTERN)) {
                operatorParts.push(tokens.shift().expression);
            }
        }
        this.operator = operatorParts.join(' ');

        if (this.operator.match(/BETWEEN$/i)) {
            const minTokens = tokens.shiftUntilExpressionPattern(/^AND$/i);
            if (minTokens.isEmpty()) {
                throw new Error('You have an error in your WHERE clause SQL syntax near "' + tokens.stringify() + '".');
            }
            tokens.shift(); // AND
            this.value = {
                min: minTokens.stringify(),
                max: tokens.stringify()
            };
        } else if (this.operator.match(/IN$/i)) {
            if (tokens.firstExpression() !== '(') {
                throw new Error('You have an error in your WHERE clause SQL syntax near "' + tokens.stringify() + '".');
            }
            tokens.shift();
            if (tokens.lastExpression() !== ')') {
                throw new Error('You have an error in your WHERE clause SQL syntax near "' + tokens.stringify() + '".');
            }
            tokens.pop();
            if (tokens.firstExpression().toUpperCase() === 'SELECT') {
                this.value = new Select(tokens);
            } else {
                this.value = tokens.splitByExpressionPattern(/^,$/).map((valuesTokens) => {
                    if (valuesTokens.lastExpression() === ',') {
                        valuesTokens.pop();
                    }
                    return valuesTokens.stringify();
                });
            }
        } else {
            this.value = tokens.stringify();
        }
    }

    toString(option) {
        option = option || ToStringOption.DEFAULT;
        let condition = this.linkType
            ? option.processReservedWords(this.linkType) + ' '
            : '';
        if (this.col) {
            condition += option.processSchemaName(this.col) + ' ' + this.operator + ' ';
        }

        if (this.operator.match(/BETWEEN$/i)) {
            condition += option.processReservedWords('BETWEEN ');
            condition += option.processLiteral(this.value.min);
            condition += option.processReservedWords(' AND ');
            return condition + option.processLiteral(this.value.max);
        }

        if (this.operator.match(/IN$/i)) {
            condition += '(';
            if (this.value.constructor.name === 'Select') {
                condition += this.value.toString();
            } else {
                condition += this.value.map((subCondition) => {
                    return subCondition.toString();
                }).join(',' + option.inClauseSpacer);
            }
            return condition + ')';
        }

        return condition + this.value.toString();
    }
}

module.exports = {
    Statement,
    StatementType
};
