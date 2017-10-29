'use strict';

const assertString = (arg) => {
    if (typeof arg !== 'string') {
        throw new Error('The argument must be string. : ' + arg);
    }
};

const StringUtils = Object.freeze({
    countChar: (string, char) => {
        assertString(string);
        return string.split(char).length - 1;
    },

    splitByFirst: (string, pattern) => {
        assertString(string);
        const matched = string.match(pattern);
        if (matched === null) {
            return [string, null, null];
        }
        const next = matched.shift();
        if (next === string) {
            return [string, null, null];
        }
        const nextIndex = string.indexOf(next);
        return [string.slice(0, nextIndex), next, string.slice(nextIndex + next.length)];
    },

    splitAll: (string, separators) => {
        assertString(string);
        let separated = [string];
        separators.forEach((separator) => {
            const moreSeparated = [];
            separated.forEach((part) => {
                let shifted, matched, left = part;
                while(left) {
                    [shifted, matched, left] = StringUtils.splitByFirst(left, separator);
                    moreSeparated.push(shifted);
                    if (matched) {
                        moreSeparated.push(matched);
                    }
                }
            });
            separated = moreSeparated;
        });
        return separated;
    },

    isNumeric: (string) => {
        return isFinite(string) && isNaN(parseFloat(string)) !== true;
    }
});

module.exports = StringUtils;
