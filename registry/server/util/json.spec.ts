import { expect } from 'chai';
import assert from 'node:assert';
import { isJSON, parse, parseJSON } from './json';

/**
 * Source https://github.com/prototypejs/prototype/blob/dee2f7d8611248abce81287e1be4156011953c90/test/unit/tests/string.test.js#L443
 */

describe('JSON util', () => {
    it('#isJSON', function () {
        assert(!isJSON(''));
        assert(!isJSON('     '));
        assert(isJSON('""'));
        assert(isJSON('"foo"'));
        assert(isJSON('{}'));
        assert(isJSON('{"a": {"b": 1}}'));
        assert(isJSON('[]'));
        assert(isJSON('null'));
        assert(isJSON('123'));
        assert(isJSON('true'));
        assert(isJSON('false'));
        assert(isJSON('"\\""'));
        assert(!isJSON('\\"'));
        assert(!isJSON('new'));
        assert(!isJSON('\u0028\u0029'));
        assert(!isJSON('@'));
    });

    it('#parse', () => {
        expect(parse(404)).equals(404);
        expect(parse('404')).equals('404');
        expect(parse('true')).equals(true);
        expect(parse('false')).equals(false);
        expect(parse('null')).equals(null);
        expect(parse('str')).equals('str');
        expect(parse('{"a": 1, "b": "2"}')).eql({ a: 1, b: '2' });
        expect(parse('["a", "b", 3, "4"]')).eql(['a', 'b', 3, '4']);
    });

    it('#parseJSON', function () {
        expect(
            parseJSON(
                JSON.stringify({
                    _statusCode: '404',
                    title: '404 not found on 127.0.0.1',
                }),
            ),
        ).eql({
            _statusCode: '404',
            title: '404 not found on 127.0.0.1',
        });
        expect(
            parseJSON(
                JSON.stringify({
                    _statusCode: 404,
                    title: '404 not found on 127.0.0.1',
                }),
            ),
        ).eql({
            _statusCode: 404,
            title: '404 not found on 127.0.0.1',
        });
    });
});
