import { describe, it, expect } from 'vitest';
import { formatCEL } from './cel-format';

describe('CEL Formatter', () => {
    it('preserves comments and attempts to keep dot-delimited field selections on the same line', () => {
        const input = `// Transform the map to contain an additional entry
// for each key and value, called key-prime and
// value-prime.
cel.bind(varName, {'key': 'value'}, varName.transformMapEntry(k, v, {k + '_prime': v + '_prime'}))`;

        const expected = `// Transform the map to contain an additional entry for each key and value,
// called key-prime and value-prime.
cel.bind(varName, {'key': 'value'},
    varName.transformMapEntry(k, v, {k + '_prime': v + '_prime'}))`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('formats chained method calls properly', () => {
        const input = `items.filter(i, int(i) % 2 == 0).map(i, i * i)`;
        expect(formatCEL(input)).toBe('items.filter(i, int(i) % 2 == 0).map(i, i * i)');
    });

    it('formats role checks properly', () => {
        const input = `user.role == "admin" && "write" in user.permissions`;
        expect(formatCEL(input)).toBe('user.role == "admin" && "write" in user.permissions');
    });

    it('formats macros properly', () => {
        const input = `user.name.startsWith("Al") ? user.name : "Unknown"`;
        const expected = `user.name.startsWith("Al") ? user.name : "Unknown"`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('returns empty string for empty input', () => {
        expect(formatCEL('')).toBe('');
        expect(formatCEL('   \n  ')).toBe('');
    });

    it('formats complex deep nesting', () => {
        const input = 'abcdefghij(b(c(d(e(f(g(h(i(j(k(l(m(n(o(p(q(r(s(t(u(v(w(x(y(z(1))))))))))))))))))))))))))';
        expect(formatCEL(input)).toContain('abcdefghij(\n    b(c');
    });

    it('handles numeric literals with decimals', () => {
        expect(formatCEL('123.456 + 0x1A')).toBe('123.456 + 0x1A');
    });

    it('handles escaped quote strings', () => {
        const input = `"hello \\"world\\"" + 'foo \\'bar\\''`;
        expect(formatCEL(input)).toBe(`"hello \\"world\\"" + 'foo \\'bar\\''`);
    });

    it('wraps long lists of arguments', () => {
        const input = `my_function("arg1", "arg2", "arg3", "arg4", "arg5", "arg6", "arg7", "arg8", "arg9", "arg10")`;
        const expected = `my_function("arg1", "arg2", "arg3", "arg4", "arg5", "arg6", "arg7", "arg8", "arg9",
    "arg10")`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('formats brackets perfectly', () => {
        expect(formatCEL('arr[0] + map["key"]')).toBe('arr[0] + map["key"]');
    });

    it('formats optional chaining and struct syntax', () => {
        expect(formatCEL('user.?manager.?name')).toBe('user.?manager.?name');
        expect(formatCEL('user[?"key"]')).toBe('user[?"key"]');
        expect(formatCEL('{?"key": value}')).toBe('{?"key": value}');
    });

    it('handles trailing whitespace parsing', () => {
        expect(formatCEL('a  ==  b  &&  c  !=  d')).toBe('a == b && c != d');
    });

    it('splits long lines on boolean operators', () => {
        const input = 'user.attributes.department == "engineering" && user.attributes.role == "senior_developer" || user.attributes.is_super_admin == true';
        const expected = `user.attributes.department == "engineering" &&
    user.attributes.role == "senior_developer" ||
    user.attributes.is_super_admin == true`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('splits long lines on comparison operators if no boolean operators exist', () => {
        const input = 'a_very_long_variable_name_one_hundred_characters == another_very_long_variable_name_one_hundred_characters';
        const expected = `a_very_long_variable_name_one_hundred_characters ==
    another_very_long_variable_name_one_hundred_characters`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('splits long chains of method calls on dots', () => {
        const input = 'items.filter(i, int(i) % 2 == 0).map(i, i * i).filter(i, i > 10).map(i, str(i)).join(",")';
        const expected = `items.filter(i, int(i) % 2 == 0)
    .map(i, i * i)
    .filter(i, i > 10)
    .map(i, str(i))
    .join(",")`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('tests wrapping of comments without subsequent code', () => {
        const input = `// This is a very long comment that will definitely need to be wrapped because it exceeds the eighty character limit that we have imposed on this file formatter.`;
        const expected = `// This is a very long comment that will definitely need to be wrapped because
// it exceeds the eighty character limit that we have imposed on this file
// formatter.`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('handles unbalanced braces robustly', () => {
        expect(formatCEL('user.name == "John" ) ] }')).toBe('user.name == "John")]}');
    });

    it('handles missing close quotes robustly', () => {
        expect(formatCEL('user.name == "Unclosed string ')).toBe('user.name == "Unclosed string "');
        expect(formatCEL("user.name == 'Unclosed string  ")).toBe("user.name == 'Unclosed string  '");
    });

    it('handles comments at end of file robustly', () => {
        expect(formatCEL('user.role == "admin" // Trailing comment')).toBe('user.role == "admin"\n// Trailing comment');
        expect(formatCEL('user.role == "admin" // Trailing \n// Double')).toBe('user.role == "admin"\n// Trailing Double');
    });

    it('handles arrays blocks properly', () => {
        const input = `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]`;
        const expected = `[
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25
]`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('handles struct blocks properly', () => {
        const input = `Msg{field: value, ?opt_field: has(other.value) ? optional.of(other.value) : optional.none()}`;
        const expected = `Msg{
  field: value,
  ?opt_field: has(other.value) ? optional.of(other.value) : optional.none()
}`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('handles long argument lists properly', () => {
        const input = `call(user.permissions, "read", "write").or((user.role == 'admin' || user.role == 'writer') && user.department == 'engineering')`;
        const expected = `call(user.permissions, "read", "write").or(
    (user.role == 'admin' || user.role == 'writer') &&
        user.department == 'engineering')`;
        expect(formatCEL(input)).toBe(expected);
    });

    it('preserves single-char operators correctly', () => {
        expect(formatCEL('1 + 2 - 3 * 4 / 5 % 6')).toBe('1 + 2 - 3 * 4 / 5 % 6');
        expect(formatCEL('! true&& -5 < 0')).toBe('!true && -5 < 0');
    });
});

