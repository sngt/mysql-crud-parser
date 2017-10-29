'use strict';

const {Option} = require('./option');
const {Structure, StructureType, Token, TokenType} = require('./structure');
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
        const COMMAND_INDEX = 0;
        if (((tokens[COMMAND_INDEX] || {}).expression || '').toUpperCase() !== type) {
            throw new Error('Not a ' + type + ' statement. : ' + Token.stringifyArray(tokens));
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
                where += ', ';
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
            statements.push(createStatementByTokens(tokenBuffer));
            tokenBuffer = [];
        }
    });
    return statements;
};
const createStatementByTokens = (tokens) => {
    const type = StatementType.classify(tokens[0].expression);
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
            return Token.stringifyArray(tokens);
    }
};

// TODO Support various patterns.
class Select extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.SELECT);

        let fromIndex = -1;
        let whereIndex = -1;
        let colBuffer = '';
        this.cols = [];
        const whereTokens = [];
        tokens.slice(1).forEach((token, i) => {
            const expression = token.expression || '';
            const capitalized = expression.toUpperCase();
            if (capitalized === 'FROM') {
                fromIndex = i;
                this.cols.push(removeBackQuote(colBuffer));
                return;
            }
            if (capitalized === 'WHERE') {
                whereIndex = i;
                whereTokens.push(token);
                return;
            }

            if (fromIndex === -1) {
                if (token.type === TokenType.SEPARATOR) {
                    this.cols.push(removeBackQuote(colBuffer));
                    colBuffer = '';
                } else {
                    colBuffer += token.expression;
                }
            } else if (whereIndex === -1) {
                this.table = removeBackQuote(token.expression);
            } else if (token.type !== TokenType.DELIMITER) {
                whereTokens.push(token);
            }
        });
        this.where = whereTokens ? new Where(whereTokens) : null;
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
            throw new Error('Invalid statement type for Insert. : ' + this.type);
        }

        //TODO implement
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

        const TABLE_NAME_INDEX = 1;
        if ((tokens[TABLE_NAME_INDEX] || {}).type !== TokenType.SCHEMA) {
            throw new Error('Failed to parse UPDATE statement. : ' + Token.stringifyArray(tokens));
        }
        this.table = removeBackQuote(tokens[TABLE_NAME_INDEX].expression);

        const SET_INDEX = 2;
        if (((tokens[SET_INDEX] || {}).expression || '').toUpperCase() !== 'SET') {
            throw new Error('Failed to parse UPDATE statement. : ' + Token.stringifyArray(tokens));
        }

        //TODO implement
    }

    toString(option) {
        option = option || Option.DEFAULT;

        let sql = option.processReservedWords('UPDATE ')
            + option.processSchemaName(this.table)
            + option.processReservedWords(' SET ');
        //TODO implement
        sql += this._buildWhere(option) + option.delimiter;
        return sql;
    }
}

class Delete extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.DELETE);

        const TABLE_NAME_INDEX = 2;
        if ((tokens[TABLE_NAME_INDEX] || {}).type !== TokenType.SCHEMA) {
            throw new Error('Failed to parse DELETE statement. : ' + Token.stringifyArray(tokens));
        }
        this.table = removeBackQuote(tokens[TABLE_NAME_INDEX].expression);

        const WHERE_INDEX = 3;
        if ((tokens[WHERE_INDEX] || {}).expression === 'WHERE') {
            this.where = new Where(tokens.slice(WHERE_INDEX));
        }
    }

    toString(option) {
        option = option || Option.DEFAULT;
        return option.processReservedWords('DELETE FROM ') + option.processSchemaName(this.table) + this._buildWhere(option) + option.delimiter;
    }
}

class Source extends Statement {
    constructor(tokens) {
        super(tokens, StatementType.SOURCE);

        const pathElements = tokens.slice(1);
        if (tokens[tokens.length - 1].type === TokenType.DELIMITER) {
            pathElements.pop();
        }
        this.filePath = pathElements.map((token) => {
            return token.expression;
        }).join('');
    }

    toString() {
        return option.processReservedWords('SOURCE ') + this.filePath + option.delimiter;
    }
}

class Where {
    constructor(tokens) {
        const WHERE_INDEX = 0;
        if ((tokens[WHERE_INDEX] || {}).expression !== 'WHERE') {
            throw new Error('The array must start with WHERE Token. : ' + Token.stringifyArray(tokens));
        }

        let left = tokens.slice(1);
        while (left.length > 0) {
            let next = left.shift();
            if (((next || {}).expression || '').toUpperCase() === 'AND') {
                next = left.shift();
            }
            if ((next || {}).type !== TokenType.SCHEMA) {
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
