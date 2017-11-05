'use strict';

const stringUtils = require('./string-utils');

// @see https://dev.mysql.com/doc/refman/5.7/en/non-typed-operators.html
const MYSQL_OPERATORS = [
    '!',
    '!=',
    '%',
    '&&',
    '&',
    '*',
    '+',
    '-',
    '->',
    '->>',
    '/',
    ':=',
    '<',
    '<<',
    '<=',
    '<=>',
    '<>',
    '=',
    '>',
    '>=',
    '>>',
    'AND',
    'BETWEEN',
    'BINARY',
    'CASE',
    'DIV',
    'IS',
    'LIKE',
    'MOD',
    'NOT',
    'OR',
    'REGEXP',
    'RLIKE',
    'SOUNDS',
    'XOR',
    '^',
    '|',
    '||',
    '~'
];
// @see https://dev.mysql.com/doc/refman/5.7/en/keywords.html
const MYSQL_KEYWORDS = [
    'ACCESSIBLE',
    'ACCOUNT',
    'ACTION',
    'ADD',
    'AFTER',
    'AGAINST',
    'AGGREGATE',
    'ALGORITHM',
    'ALL',
    'ALTER',
    'ALWAYS',
    'ANALYSE',
    'ANALYZE',
    'AND',
    'ANY',
    'AS',
    'ASC',
    'ASCII',
    'ASENSITIVE',
    'AT',
    'AUTOEXTEND_SIZE',
    'AUTO_INCREMENT',
    'AVG',
    'AVG_ROW_LENGTH',
    'BACKUP',
    'BEFORE',
    'BEGIN',
    'BETWEEN',
    'BIGINT',
    'BINARY',
    'BINLOG',
    'BIT',
    'BLOB',
    'BLOCK',
    'BOOL',
    'BOOLEAN',
    'BOTH',
    'BTREE',
    'BY',
    'BYTE',
    'CACHE',
    'CALL',
    'CASCADE',
    'CASCADED',
    'CASE',
    'CATALOG_NAME',
    'CHAIN',
    'CHANGE',
    'CHANGED',
    'CHANNEL',
    'CHAR',
    'CHARACTER',
    'CHARSET',
    'CHECK',
    'CHECKSUM',
    'CIPHER',
    'CLASS_ORIGIN',
    'CLIENT',
    'CLOSE',
    'COALESCE',
    'CODE',
    'COLLATE',
    'COLLATION',
    'COLUMN',
    'COLUMNS',
    'COLUMN_FORMAT',
    'COLUMN_NAME',
    'COMMENT',
    'COMMIT',
    'COMMITTED',
    'COMPACT',
    'COMPLETION',
    'COMPRESSED',
    'COMPRESSION',
    'CONCURRENT',
    'CONDITION',
    'CONNECTION',
    'CONSISTENT',
    'CONSTRAINT',
    'CONSTRAINT_CATALOG',
    'CONSTRAINT_NAME',
    'CONSTRAINT_SCHEMA',
    'CONTAINS',
    'CONTEXT',
    'CONTINUE',
    'CONVERT',
    'CPU',
    'CREATE',
    'CROSS',
    'CUBE',
    'CURRENT',
    'CURRENT_DATE',
    'CURRENT_TIME',
    'CURRENT_TIMESTAMP',
    'CURRENT_USER',
    'CURSOR',
    'CURSOR_NAME',
    'DATA',
    'DATABASE',
    'DATABASES',
    'DATAFILE',
    'DATE',
    'DATETIME',
    'DAY',
    'DAY_HOUR',
    'DAY_MICROSECOND',
    'DAY_MINUTE',
    'DAY_SECOND',
    'DEALLOCATE',
    'DEC',
    'DECIMAL',
    'DECLARE',
    'DEFAULT',
    'DEFAULT_AUTH',
    'DEFINER',
    'DELAYED',
    'DELAY_KEY_WRITE',
    'DELETE',
    'DESC',
    'DESCRIBE',
    'DES_KEY_FILE',
    'DETERMINISTIC',
    'DIAGNOSTICS',
    'DIRECTORY',
    'DISABLE',
    'DISCARD',
    'DISK',
    'DISTINCT',
    'DISTINCTROW',
    'DIV',
    'DO',
    'DOUBLE',
    'DROP',
    'DUAL',
    'DUMPFILE',
    'DUPLICATE',
    'DYNAMIC',
    'EACH',
    'ELSE',
    'ELSEIF',
    'ENABLE',
    'ENCLOSED',
    'ENCRYPTION',
    'END',
    'ENDS',
    'ENGINE',
    'ENGINES',
    'ENUM',
    'ERROR',
    'ERRORS',
    'ESCAPE',
    'ESCAPED',
    'EVENT',
    'EVENTS',
    'EVERY',
    'EXCHANGE',
    'EXECUTE',
    'EXISTS',
    'EXIT',
    'EXPANSION',
    'EXPIRE',
    'EXPLAIN',
    'EXPORT',
    'EXTENDED',
    'EXTENT_SIZE',
    'FALSE',
    'FAST',
    'FAULTS',
    'FETCH',
    'FIELDS',
    'FILE',
    'FILE_BLOCK_SIZE',
    'FILTER',
    'FIRST',
    'FIXED',
    'FLOAT',
    'FLOAT4',
    'FLOAT8',
    'FLUSH',
    'FOLLOWS',
    'FOR',
    'FORCE',
    'FOREIGN',
    'FORMAT',
    'FOUND',
    'FROM',
    'FULL',
    'FULLTEXT',
    'FUNCTION',
    'GENERAL',
    'GENERATED',
    'GEOMETRY',
    'GEOMETRYCOLLECTION',
    'GET',
    'GET_FORMAT',
    'GLOBAL',
    'GRANT',
    'GRANTS',
    'GROUP',
    'GROUP_REPLICATION',
    'HANDLER',
    'HASH',
    'HAVING',
    'HELP',
    'HIGH_PRIORITY',
    'HOST',
    'HOSTS',
    'HOUR',
    'HOUR_MICROSECOND',
    'HOUR_MINUTE',
    'HOUR_SECOND',
    'IDENTIFIED',
    'IF',
    'IGNORE',
    'IGNORE_SERVER_IDS',
    'IMPORT',
    'IN',
    'INDEX',
    'INDEXES',
    'INFILE',
    'INITIAL_SIZE',
    'INNER',
    'INOUT',
    'INSENSITIVE',
    'INSERT',
    'INSERT_METHOD',
    'INSTALL',
    'INSTANCE',
    'INT',
    'INT1',
    'INT2',
    'INT3',
    'INT4',
    'INT8',
    'INTEGER',
    'INTERVAL',
    'INTO',
    'INVOKER',
    'IO',
    'IO_AFTER_GTIDS',
    'IO_BEFORE_GTIDS',
    'IO_THREAD',
    'IPC',
    'IS',
    'ISOLATION',
    'ISSUER',
    'ITERATE',
    'JOIN',
    'JSON',
    'KEY',
    'KEYS',
    'KEY_BLOCK_SIZE',
    'KILL',
    'LANGUAGE',
    'LAST',
    'LEADING',
    'LEAVE',
    'LEAVES',
    'LEFT',
    'LESS',
    'LEVEL',
    'LIKE',
    'LIMIT',
    'LINEAR',
    'LINES',
    'LINESTRING',
    'LIST',
    'LOAD',
    'LOCAL',
    'LOCALTIME',
    'LOCALTIMESTAMP',
    'LOCK',
    'LOCKS',
    'LOGFILE',
    'LOGS',
    'LONG',
    'LONGBLOB',
    'LONGTEXT',
    'LOOP',
    'LOW_PRIORITY',
    'MASTER',
    'MASTER_AUTO_POSITION',
    'MASTER_BIND',
    'MASTER_CONNECT_RETRY',
    'MASTER_DELAY',
    'MASTER_HEARTBEAT_PERIOD',
    'MASTER_HOST',
    'MASTER_LOG_FILE',
    'MASTER_LOG_POS',
    'MASTER_PASSWORD',
    'MASTER_PORT',
    'MASTER_RETRY_COUNT',
    'MASTER_SERVER_ID',
    'MASTER_SSL',
    'MASTER_SSL_CA',
    'MASTER_SSL_CAPATH',
    'MASTER_SSL_CERT',
    'MASTER_SSL_CIPHER',
    'MASTER_SSL_CRL',
    'MASTER_SSL_CRLPATH',
    'MASTER_SSL_KEY',
    'MASTER_SSL_VERIFY_SERVER_CERT',
    'MASTER_TLS_VERSION',
    'MASTER_USER',
    'MATCH',
    'MAXVALUE',
    'MAX_CONNECTIONS_PER_HOUR',
    'MAX_QUERIES_PER_HOUR',
    'MAX_ROWS',
    'MAX_SIZE',
    'MAX_STATEMENT_TIME',
    'MAX_UPDATES_PER_HOUR',
    'MAX_USER_CONNECTIONS',
    'MEDIUM',
    'MEDIUMBLOB',
    'MEDIUMINT',
    'MEDIUMTEXT',
    'MEMORY',
    'MERGE',
    'MESSAGE_TEXT',
    'MICROSECOND',
    'MIDDLEINT',
    'MIGRATE',
    'MINUTE',
    'MINUTE_MICROSECOND',
    'MINUTE_SECOND',
    'MIN_ROWS',
    'MOD',
    'MODE',
    'MODIFIES',
    'MODIFY',
    'MONTH',
    'MULTILINESTRING',
    'MULTIPOINT',
    'MULTIPOLYGON',
    'MUTEX',
    'MYSQL_ERRNO',
    'NAME',
    'NAMES',
    'NATIONAL',
    'NATURAL',
    'NCHAR',
    'NDB',
    'NDBCLUSTER',
    'NEVER',
    'NEW',
    'NEXT',
    'NO',
    'NODEGROUP',
    'NONBLOCKING',
    'NONE',
    'NOT',
    'NO_WAIT',
    'NO_WRITE_TO_BINLOG',
    'NULL',
    'NUMBER',
    'NUMERIC',
    'NVARCHAR',
    'OFFSET',
    'OLD_PASSWORD',
    'ON',
    'ONE',
    'ONLY',
    'OPEN',
    'OPTIMIZE',
    'OPTIMIZER_COSTS',
    'OPTION',
    'OPTIONALLY',
    'OPTIONS',
    'OR',
    'ORDER',
    'OUT',
    'OUTER',
    'OUTFILE',
    'OWNER',
    'PACK_KEYS',
    'PAGE',
    'PARSER',
    'PARSE_GCOL_EXPR',
    'PARTIAL',
    'PARTITION',
    'PARTITIONING',
    'PARTITIONS',
    'PASSWORD',
    'PHASE',
    'PLUGIN',
    'PLUGINS',
    'PLUGIN_DIR',
    'POINT',
    'POLYGON',
    'PORT',
    'PRECEDES',
    'PRECISION',
    'PREPARE',
    'PRESERVE',
    'PREV',
    'PRIMARY',
    'PRIVILEGES',
    'PROCEDURE',
    'PROCESSLIST',
    'PROFILE',
    'PROFILES',
    'PROXY',
    'PURGE',
    'QUARTER',
    'QUERY',
    'QUICK',
    'RANGE',
    'READ',
    'READS',
    'READ_ONLY',
    'READ_WRITE',
    'REAL',
    'REBUILD',
    'RECOVER',
    'REDOFILE',
    'REDO_BUFFER_SIZE',
    'REDUNDANT',
    'REFERENCES',
    'REGEXP',
    'RELAY',
    'RELAYLOG',
    'RELAY_LOG_FILE',
    'RELAY_LOG_POS',
    'RELAY_THREAD',
    'RELEASE',
    'RELOAD',
    'REMOVE',
    'RENAME',
    'REORGANIZE',
    'REPAIR',
    'REPEAT',
    'REPEATABLE',
    'REPLACE',
    'REPLICATE_DO_DB',
    'REPLICATE_DO_TABLE',
    'REPLICATE_IGNORE_DB',
    'REPLICATE_IGNORE_TABLE',
    'REPLICATE_REWRITE_DB',
    'REPLICATE_WILD_DO_TABLE',
    'REPLICATE_WILD_IGNORE_TABLE',
    'REPLICATION',
    'REQUIRE',
    'RESET',
    'RESIGNAL',
    'RESTORE',
    'RESTRICT',
    'RESUME',
    'RETURN',
    'RETURNED_SQLSTATE',
    'RETURNS',
    'REVERSE',
    'REVOKE',
    'RIGHT',
    'RLIKE',
    'ROLLBACK',
    'ROLLUP',
    'ROTATE',
    'ROUTINE',
    'ROW',
    'ROWS',
    'ROW_COUNT',
    'ROW_FORMAT',
    'RTREE',
    'SAVEPOINT',
    'SCHEDULE',
    'SCHEMA',
    'SCHEMAS',
    'SCHEMA_NAME',
    'SECOND',
    'SECOND_MICROSECOND',
    'SECURITY',
    'SELECT',
    'SENSITIVE',
    'SEPARATOR',
    'SERIAL',
    'SERIALIZABLE',
    'SERVER',
    'SESSION',
    'SET',
    'SHARE',
    'SHOW',
    'SHUTDOWN',
    'SIGNAL',
    'SIGNED',
    'SIMPLE',
    'SLAVE',
    'SLOW',
    'SMALLINT',
    'SNAPSHOT',
    'SOCKET',
    'SOME',
    'SONAME',
    'SOUNDS',
    'SOURCE',
    'SPATIAL',
    'SPECIFIC',
    'SQL',
    'SQLEXCEPTION',
    'SQLSTATE',
    'SQLWARNING',
    'SQL_AFTER_GTIDS',
    'SQL_AFTER_MTS_GAPS',
    'SQL_BEFORE_GTIDS',
    'SQL_BIG_RESULT',
    'SQL_BUFFER_RESULT',
    'SQL_CACHE',
    'SQL_CALC_FOUND_ROWS',
    'SQL_NO_CACHE',
    'SQL_SMALL_RESULT',
    'SQL_THREAD',
    'SQL_TSI_DAY',
    'SQL_TSI_HOUR',
    'SQL_TSI_MINUTE',
    'SQL_TSI_MONTH',
    'SQL_TSI_QUARTER',
    'SQL_TSI_SECOND',
    'SQL_TSI_WEEK',
    'SQL_TSI_YEAR',
    'SSL',
    'STACKED',
    'START',
    'STARTING',
    'STARTS',
    'STATS_AUTO_RECALC',
    'STATS_PERSISTENT',
    'STATS_SAMPLE_PAGES',
    'STATUS',
    'STOP',
    'STORAGE',
    'STORED',
    'STRAIGHT_JOIN',
    'STRING',
    'SUBCLASS_ORIGIN',
    'SUBJECT',
    'SUBPARTITION',
    'SUBPARTITIONS',
    'SUPER',
    'SUSPEND',
    'SWAPS',
    'SWITCHES',
    'TABLE',
    'TABLES',
    'TABLESPACE',
    'TABLE_CHECKSUM',
    'TABLE_NAME',
    'TEMPORARY',
    'TEMPTABLE',
    'TERMINATED',
    'TEXT',
    'THAN',
    'THEN',
    'TIME',
    'TIMESTAMP',
    'TIMESTAMPADD',
    'TIMESTAMPDIFF',
    'TINYBLOB',
    'TINYINT',
    'TINYTEXT',
    'TO',
    'TRAILING',
    'TRANSACTION',
    'TRIGGER',
    'TRIGGERS',
    'TRUE',
    'TRUNCATE',
    'TYPE',
    'TYPES',
    'UNCOMMITTED',
    'UNDEFINED',
    'UNDO',
    'UNDOFILE',
    'UNDO_BUFFER_SIZE',
    'UNICODE',
    'UNINSTALL',
    'UNION',
    'UNIQUE',
    'UNKNOWN',
    'UNLOCK',
    'UNSIGNED',
    'UNTIL',
    'UPDATE',
    'UPGRADE',
    'USAGE',
    'USE',
    'USER',
    'USER_RESOURCES',
    'USE_FRM',
    'USING',
    'UTC_DATE',
    'UTC_TIME',
    'UTC_TIMESTAMP',
    'VALIDATION',
    'VALUE',
    'VALUES',
    'VARBINARY',
    'VARCHAR',
    'VARCHARACTER',
    'VARIABLES',
    'VARYING',
    'VIEW',
    'VIRTUAL',
    'WAIT',
    'WARNINGS',
    'WEEK',
    'WEIGHT_STRING',
    'WHEN',
    'WHERE',
    'WHILE',
    'WITH',
    'WITHOUT',
    'WORK',
    'WRAPPER',
    'WRITE',
    'X509',
    'XA',
    'XID',
    'XML',
    'XOR',
    'YEAR',
    'YEAR_MONTH',
    'ZEROFILL'
];

const StructureType = Object.freeze({TOKEN: 'TOKEN', COMMENT: 'COMMENT'});

class Structure {
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }
}
Structure.resolve = (sql) => {
    const NESTABLE_STRUCTURE_BEGINNING_PATTERN = /(\/\*|\-\-\s|#|'|")/;

    const structures = [];
    let shifted,
        separator,
        left = (sql || '').trim();
    while (left) {
        [shifted, separator, left] = stringUtils.splitByFirst(left, NESTABLE_STRUCTURE_BEGINNING_PATTERN);
        resolveIntoSimpleTokens(shifted).forEach((token) => {
            structures.push(new Structure(StructureType.TOKEN, token));
        });
        if (separator === null) {
            break;
        }

        if (separator === '/*') {
            [shifted, separator, left] = stringUtils.splitByFirst(left, /\*\//);
            if (separator) {
                structures.push(new Structure(StructureType.COMMENT, '/*' + shifted + '*/'));
            } else {
                structures.push(new Structure(StructureType.COMMENT, '/*' + shifted));
            }
        } else if (separator === "'" || separator === '"') {
            const quote = separator;
            const escapedQuotePattern = new RegExp('\\\\' + quote, 'g');

            //TODO Support patterns like 'aaaaaaaa\\'.
            let comment = quote;
            while (left) {
                [shifted, separator, left] = stringUtils.splitByFirst(left, quote);
                comment += shifted;
                if (separator === null || left === null) {
                    break;
                }
                comment += separator;
                if (left.charAt(0) === quote) {
                    continue;
                }
                if (stringUtils.countChar(comment.replace(escapedQuotePattern, ''), quote) % 2 !== 0) {
                    continue;
                }
                break;
            }

            const token = new Token(TokenType.LITERAL, comment);
            structures.push(new Structure(StructureType.TOKEN, token));
        } else if (separator == '#' || separator.startsWith('--')) {
            const beginning = separator;
            [shifted, separator, left] = stringUtils.splitByFirst(left, /(\r\n|\r|\n)/);
            structures.push(new Structure(StructureType.COMMENT, beginning + shifted + (separator || '')));
        }
    }
    return structures;
};
const resolveIntoSimpleTokens = (text) => {
    const tokens = [];
    stringUtils.splitAll(text, [
        /`.*`/,
        /(\d+\.\d+|\.)/,
        /(<\=>|<\=|>\=|!\=|:\=|\=|<>|<<|<|\->>|->|>>|>|\|\||\||&&|&|\^|\!|\+|\-|\*|\/|%|~)/,
        /,/,
        /;/,
        /\\G/,
        /\(/,
        /\)/,
        /\s+/
    ]).forEach((part) => {
        const trimmed = part.trim();
        if (trimmed === '') {
            return;
        }
        tokens.push(new Token(TokenType.classify(trimmed), trimmed));
    });
    return tokens;
}

const TokenType = Object.freeze({
    KEYWORD: 'KEYWORD',
    OPERATOR: 'OPERATOR',
    SCHEMA: 'SCHEMA',
    LITERAL: 'LITERAL',
    DELIMITER: 'DELIMITER', // ; OR \G
    PARENTHESES: 'PARENTHESES', // ( OR )
    SEPARATOR: 'SEPARATOR', // ,
    ATTACHED: 'ATTACHED', // .

    classify: (token) => {
        if ((token || '').length <= 0) {
            return null;
        }

        const DICTIONARY = {
            ';': TokenType.DELIMITER,
            '\\G': TokenType.DELIMITER,
            ',': TokenType.SEPARATOR,
            '(': TokenType.PARENTHESES,
            ')': TokenType.PARENTHESES,
            '.': TokenType.ATTACHED
        };
        if (DICTIONARY[token]) {
            return DICTIONARY[token];
        }

        const capitalized = token.toUpperCase();
        if (MYSQL_OPERATORS.indexOf(capitalized) !== -1) {
            return TokenType.OPERATOR;
        }
        if (MYSQL_KEYWORDS.indexOf(capitalized) !== -1) {
            return TokenType.KEYWORD;
        }

        if (stringUtils.isNumeric(token)) {
            return TokenType.LITERAL;
        }
        const firstChar = token.charAt(0);
        const lastChar = token.charAt(token.length - 1);
        if (firstChar === "'" && lastChar === "'") {
            return TokenType.LITERAL;
        }
        if (firstChar === '"' && lastChar === '"') {
            return TokenType.LITERAL;
        }

        return TokenType.SCHEMA;
    },

    // Reserved keywords without quotes may also be used as col name.
    mayBeSchema: (type) => {
        return [TokenType.SCHEMA, TokenType.KEYWORD].indexOf(type) !== -1;
    }
});

class Token {
    constructor(type, expression) {
        this.type = type;
        this.expression = expression;
    }
}
class Tokens {
    constructor(list) {
        this.list = (list || []).concat();
    }

    clone() {
        return new Tokens(this.list.concat());
    }

    stringify() {
        return this.list.map((token, i) => {
            const type = token.type;
            const expression = token.expression;
            if (i <= 0) {
                return expression;
            }

            const previousType = this.list[i - 1].type;
            if (previousType === TokenType.ATTACHED) {
                return expression;
            }
            if (type === TokenType.OPERATOR && previousType === TokenType.LITERAL) {
                return ' ' + token.expression + ' ';
            }
            if (TokenType.mayBeSchema(token.type)) {
                return ' ' + token.expression;
            }

            return token.expression;
        }).join('').trim();
    }

    hasEntry() {
        return this.list.length > 0;
    }

    isEmpty() {
        return this.hasEntry() !== true;
    }

    first() {
        return this.list[0] || null;
    }

    firstType() {
        return (this.first() || {}).type;
    }

    firstExpression() {
        return (this.first() || {}).expression || '';
    }

    last() {
        return this.list[this.list.length - 1] || null;
    }

    lastType() {
        return (this.last() || {}).type;
    }

    lastExpression() {
        return (this.last() || {}).expression;
    }

    typeAt(index) {
        return (this.list[index] || {}).type;
    }

    expressionAt(index) {
        return (this.list[index] || {}).expression || '';
    }

    shift() {
        return this.list.shift();
    }

    pop() {
        return this.list.pop();
    }

    trimDelimiters() {
        while (this.firstType() === TokenType.DELIMITER) {
            this.shift();
        }
        while (this.lastType() === TokenType.DELIMITER) {
            this.pop();
        }
    }

    shiftUntilExpressionPattern(pattern) {
        let targetIndex = -1;
        this.list.forEach((token, i) => {
            if (targetIndex === -1 && (token.expression || '').match(pattern)) {
                targetIndex = i;
                return false;
            }
        });
        if (targetIndex === -1) {
            return new Tokens([]);
        }
        const shifted = new Tokens(this.list.slice(0, targetIndex));
        this.list = this.list.slice(targetIndex);
        return shifted;
    }

    splitByExpressionPattern(pattern) {
        const split = [];
        let list = [];
        this.list.forEach((token) => {
            if ((token.expression || '').match(pattern)) {
                split.push(new Tokens(list));
                list = [];
            } else {
                list.push(token);
            }
        });
        if (list.length) {
            split.push(new Tokens(list));
        }
        return split;
    }
}

module.exports = {
    MYSQL_KEYWORDS,
    Structure,
    StructureType,
    Tokens,
    TokenType
};
