'use strict';

const fs = require('fs');
const {Option} = require('./option');
const {Structure, StructureType, Tokens, TokenType} = require('./structure');
const stringUtils = require('./string-utils');

const removeBackQuote = (text) => {
    return text.replace(/^\s*`/, '').replace(/`\s*$/, '');
};

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
    }

    _buildWhere(option) {
        if (typeof this.where !== 'object') {
            return '';
        }

        let where = '';
        for (let col in this.where) {
            if (this.where.hasOwnProperty(col) !== true) {
                continue;
            }

            if (where === '') {
                where = option.processReservedWords(' WHERE ');
            } else {
                where += option.processReservedWords(' AND ');
            }
            where += option.processSchemaName(col);
            if (typeof this.where[col].join === 'function') {
                where += ' IN (';
                where += this.where[col].map(option.processLiteral).join(',');
                where += ')';
            } else {
                where += ' = ' + option.processLiteral(this.where[col]);
            }
        }
        return where;
    }
}
Statement.resolve = (sql) => {
    const statements = [];

    let tokenBuffer = [];
    Structure.resolve(sql).forEach((structure) => {
        if (structure.type === StructureType.COMMENT) {
            statements.push(structure.content);
            return;
        }

        const token = structure.content;
        tokenBuffer.push(token);
        if (token.type === TokenType.DELIMITER) {
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

// TODO Support various patterns.
class Select extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.SELECT);
        tokens = tokens.clone();
        tokens.shift();// SELECT

        const colsTokens = tokens.shiftUntilExpressionPattern(/^FROM$/i);
        this.cols = colsTokens.splitByExpressionPattern(/,/).map((colTokens) => {
            return colTokens.stringify();
        });

        if (tokens.firstExpression().toUpperCase() !== 'FROM') {
            throw new Error('You have an error in your SELECT SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift();

        this.table = removeBackQuote(tokens.shift().expression);

        tokens.trimDelimiters();
        this.where = tokens.hasEntry() ? new Where(tokens) : null;
    }

    toString(option) {
        option = option || Option.DEFAULT;
        return option.processReservedWords('SELECT ')
            + this.cols.map(option.processSchemaName).join(',')
            + option.processReservedWords(' FROM ')
            + option.processSchemaName(this.table)
            + this._buildWhere(option)
            + option.delimiter;
    }
}

class Insert extends Statement {
    constructor(tokens, type) {
        super(tokens, type || StatementType.INSERT);
        if ([StatementType.INSERT, StatementType.REPLACE].indexOf(this.type) === -1) {
            throw new Error('Invalid statement type for INSERT. : ' + this.type);
        }
        tokens = tokens.clone();
        tokens.shift();// INSERT

        if (tokens.firstExpression().toUpperCase() !== 'INTO') {
            throw new Error('You have an error in your INSERT SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift();

        if (TokenType.mayBeSchema(tokens.firstType()) !==  true) {
            throw new Error('You have an error in your INSERT SQL syntax near "' + tokens.stringify() + '".');
        }
        this.table = removeBackQuote(tokens.shift().expression);

        this.cols = null;
        tokens.trimDelimiters();

        const left = tokens.list;
        let next = left.shift() || {};
        if (next.expression === '(') {
            this.cols = [];
            while(left.length > 0 && next.expression !== ')') {
                next = left.shift() || {};
                if ([TokenType.SEPARATOR, TokenType.PARENTHESES].indexOf(next.type) === -1) {
                    this.cols.push(removeBackQuote(next.expression));
                }
            }
            next = left.shift() || {};
        }

        if (/VALUES?/.test(next.expression) !== true) {
            throw new Error('Failed to parse INSERT statement. : ' + Token.stringifyArray(tokens));
        }

        this.valuesList = [];
        let values = [];
        let valueBuffer = '';
        let parenthesesOpened = 0;
        while(left.length > 0) {
            let next = left.shift() || {};
            if (next.expression === '(') {
                parenthesesOpened++;
                if (parenthesesOpened >= 2) {
                    valueBuffer += next.expression;
                }
            } else if (next.expression === ')') {
                if (parenthesesOpened >= 2) {
                    valueBuffer += next.expression;
                }
                parenthesesOpened--;
            } else if (next.type !== TokenType.SEPARATOR || parenthesesOpened >= 2) {
                valueBuffer += next.expression;
            }

            if (valueBuffer && next.type !== TokenType.SEPARATOR && parenthesesOpened <= 1) {
                values.push(valueBuffer);
                valueBuffer = '';
            }

            if (parenthesesOpened <= 0 && values.length > 0) {
                if (this.cols && this.cols.length > 0 && this.cols.length !== values.length) {
                    throw new Error('Column count doesn\'t match value count at "' + values.join(',') + '"');
                }
                this.valuesList.push(values);
                values = [];
            }
        }
    }

    toString(option) {
        option = option || Option.DEFAULT;

        let sql = option.processReservedWords(this.type + ' INTO')
            + option.processSchemaName(this.table);
        if (this.cols && this.cols.length > 0) {
            sql += '(' + this.cols.map(option.processSchemaName).join(',') + ')';
        }

        sql += option.processReservedWords(' VALUES');
        sql += this.valuesList.length > 1 ? option.breakChar : ' ';

        return sql
            + this.valuesList.map((values) => {
             return '(' + values.map(option.processLiteral).join(',') + ')';
        }).join(',' + option.breakChar) + option.delimiter;
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
        tokens = tokens.clone();
        tokens.shift();// UPDATE

        if (TokenType.mayBeSchema(tokens.firstType()) !== true) {
            throw new Error('You have an error in your UPDATE SQL syntax near "' + tokens.stringify() + '".');
        }
        this.table = removeBackQuote(tokens.shift().expression);

        if (tokens.firstExpression().toUpperCase() !== 'SET') {
            throw new Error('You have an error in your UPDATE SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift();

        const sets = {};
        const setsTokens = tokens.shiftUntilExpressionPattern(/^WHERE$/i);
        setsTokens.splitByExpressionPattern(/,/).forEach((setTokens) => {
            const colTokens = setTokens.shiftUntilExpressionPattern(/\=/);
            if (colTokens.isEmpty()) {
                throw new Error('You have an error in your UPDATE SQL syntax near "' + setTokens.stringify() + '".');
            }
            setTokens.shift();// =
            if (setTokens.isEmpty()) {
                throw new Error('You have an error in your UPDATE SQL syntax near "' + setsTokens.stringify() + '".');
            }
            sets[colTokens.stringify()] = setTokens.stringify();
        });
        this.sets = sets;

        tokens.trimDelimiters();
        this.where = tokens.hasEntry() ? new Where(tokens) : null;
    }

    toString(option) {
        option = option || Option.DEFAULT;

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

        return option.processReservedWords('UPDATE ')
            + option.processSchemaName(this.table)
            + option.processReservedWords(' SET ')
            + set
            + this._buildWhere(option)
            + option.delimiter;
    }
}

class Delete extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.DELETE);
        tokens = tokens.clone();
        tokens.shift();// DELETE

        if (tokens.firstExpression().toUpperCase() !== 'FROM') {
            throw new Error('You have an error in your DELETE SQL syntax near "' + tokens.stringify() + '".');
        }
        tokens.shift();

        if (TokenType.mayBeSchema(tokens.firstType()) !==  true) {
            throw new Error('You have an error in your DELETE SQL syntax near "' + tokens.stringify() + '".');
        }
        this.table = removeBackQuote(tokens.shift().expression);

        tokens.trimDelimiters();
        if (tokens.isEmpty()) {
            return;
        }

        if (tokens.firstExpression().toUpperCase() !== 'WHERE') {
            throw new Error('You have an error in your DELETE SQL syntax near "' + tokens.stringify() + '".');
        }
        this.where = new Where(tokens);
    }

    toString(option) {
        option = option || Option.DEFAULT;
        return option.processReservedWords('DELETE FROM ') + option.processSchemaName(this.table) + this._buildWhere(option) + option.delimiter;
    }
}

class Source extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.SOURCE);
        tokens = tokens.clone();
        tokens.shift();// SOURCE

        tokens.trimDelimiters();
        this.filePath = tokens.list.map((token) => {
            return token.expression;
        }).join('');
    }

    toString(option) {
        option = option || Option.DEFAULT;
        return option.processReservedWords('SOURCE ') + this.filePath + option.delimiter;
    }

    expand(encode) {
        if (fs.existsSync(this.filePath) !== true) {
            return this;
        }
        return Statement.resolve(fs.readFileSync(this.filePath, encode || 'utf8'));
    }
}

class Where {
    constructor(tokens) {
        let left = tokens.clone().list;
        let next = left.shift() || {};
        if ((next.expression || '').toUpperCase() !== 'WHERE') {
            throw new Error('The array must start with WHERE Token. : ' + Token.stringifyArray(tokens));
        }

        while (left.length > 0) {
            next = left.shift() || {};
            if ((next.expression || '').toUpperCase() === 'AND') {
                next = left.shift() || {};
            }
            if (TokenType.mayBeSchema(next.type) !== true) {
                throw new Error('Failed to parse WHERE clause. : ' + Token.stringifyArray(tokens));
            }

            const col = removeBackQuote(next.expression);

            next = left.shift();
            const operator = (next || {}).expression;
            if (['=', 'IN'].indexOf((operator || '').toUpperCase()) === -1) {
                throw new Error('WHERE clause may have syntax error near "' + operator + '...".');
            }

            let values;
            next = left.shift();
            if ((next || {}).expression === '(') {
                const subTokens = [];
                let parenthesesOpened = 1;
                while (left.length > 0 && parenthesesOpened > 0) {
                    next = left.shift();
                    switch ((next || {}).expression) {
                        case '(':
                            parenthesesOpened++;
                            break;
                        case ')':
                            parenthesesOpened--;
                            break;
                        default:
                            break;
                    }
                    if (parenthesesOpened > 0) {
                        subTokens.push(next);
                    }
                }
                if (subTokens.length <= 0) {
                    throw new Error('WHERE clause may have syntax error near ")...".');
                }

                if ((subTokens[0].expression || '').toUpperCase() === 'SELECT') {
                    values = new Select(subTokens);
                } else {
                    values = [];
                    subTokens.forEach((subToken, i) => {
                        if (subToken.type === TokenType.LITERAL) {
                            values.push(subToken.expression);
                        } else if ((subTokens[i - 1] || {}).type === TokenType.SEPARATOR) {
                            throw new Error('WHERE clause may have syntax error near "' + Token.stringifyArray(subTokens) + '...".');
                        }
                    });
                }
            } else if (operator === '=') {
                values = (next || {}).expression;
                if ((next || {}).type !== TokenType.LITERAL) {
                    throw new Error('WHERE clause may have syntax error near "' + values + '...".');
                }
            } else {
                throw new Error('WHERE clause may have syntax error near "' + (next || {}).expression + '...".');
            }
            this[col] = values;
        }
    }
}

module.exports = {
    Statement,
    StatementType
};
