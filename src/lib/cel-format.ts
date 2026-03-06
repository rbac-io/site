
/**
 * Simple CEL Formatter
 * 
 * Rules:
 * - 80 character line limit.
 * - Prefer line breaks at:
 *   1. Chained methods (e.g. .filter(), .all())
 *   2. Infix operators (&&, ||, ==, etc.)
 *   3. Function argument lists (commas)
 * - Added logic to ensure a consistent two-space indentation increment for every line break.
 * - Refined tokenization to recognize `in` as an operator, ensuring it has proper spacing on either side even when line breaks occur nearby.
 * - 2 space indentation for each newline.
 */

interface Token {
    type: 'identifier' | 'operator' | 'unary_operator' | 'literal' | 'delimiter' | 'dot' | 'comment' | 'colon' | 'ternary_colon';
    value: string;
}

export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    let ternaryDepths = 0;

    while (i < input.length) {
        if (input.startsWith('//', i)) {
            let value = '';
            while (i < input.length && input[i] !== '\n') {
                value += input[i];
                i++;
            }
            tokens.push({ type: 'comment', value });
            continue;
        }

        const char = input[i];

        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Strings
        if (char === '"' || char === "'") {
            const quote = char;
            let value = char;
            i++;
            while (i < input.length && input[i] !== quote) {
                if (input[i] === '\\') {
                    value += input[i] + (input[i + 1] || '');
                    i += 2;
                } else {
                    value += input[i];
                    i++;
                }
            }
            value += quote;
            i++;
            tokens.push({ type: 'literal', value });
            continue;
        }

        // Numbers
        if (/[0-9]/.test(char)) {
            let value = '';
            while (i < input.length && /[0-9.xXa-fA-F]/.test(input[i])) {
                value += input[i];
                i++;
            }
            tokens.push({ type: 'literal', value });
            continue;
        }

        // Identifiers
        if (/[a-zA-Z_]/.test(char)) {
            let value = '';
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                value += input[i];
                i++;
            }
            // Check for keyword operators
            if (value === 'in') {
                tokens.push({ type: 'operator', value });
            } else {
                tokens.push({ type: 'identifier', value });
            }
            continue;
        }

        // Multi-char operators
        const twoChar = input.slice(i, i + 2);
        if (['&&', '||', '==', '!=', '<=', '>=', '.?', '[?', '{?', '?:'].includes(twoChar)) {
            let type: Token['type'] = 'operator';
            if (twoChar === '.?') type = 'dot';
            else if (twoChar === '[?' || twoChar === '{?') type = 'delimiter';
            else if (twoChar === '?:') type = 'operator';

            tokens.push({ type, value: twoChar });
            i += 2;
            continue;
        }

        // Single char operators / dots / delimiters
        if (char === '.') {
            tokens.push({ type: 'dot', value: char });
            i++;
            continue;
        }

        if ('()[]{},'.includes(char)) {
            tokens.push({ type: 'delimiter', value: char });
            i++;
            continue;
        }

        if (char === ':') {
            if (ternaryDepths > 0) {
                ternaryDepths--;
                tokens.push({ type: 'ternary_colon', value: char });
            } else {
                tokens.push({ type: 'colon', value: char });
            }
            i++;
            continue;
        }

        if ('+-*/%<>!&|?'.includes(char)) {
            let type: Token['type'] = 'operator';
            if (char === '!') {
                type = 'unary_operator';
            } else if (char === '-') {
                const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                if (!prev || prev.type === 'operator' || prev.type === 'colon' || (prev.type === 'delimiter' && ![']', ')', '}'].includes(prev.value))) {
                    type = 'unary_operator';
                }
            } else if (char === '?') {
                const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                if (prev && (prev.type === 'delimiter' && ['{', ','].includes(prev.value))) {
                    type = 'unary_operator';
                } else {
                    ternaryDepths++;
                }
            }
            tokens.push({ type, value: char });
            i++;
            continue;
        }

        // Catch-all to preserve characters
        tokens.push({ type: 'identifier', value: char });
        i++;
    }
    return tokens;
}

interface Node {
    tokens: (Token | Node)[];
    type: 'group';
    open: string;
    close: string;
}

export function parse(tokens: Token[]): (Token | Node)[] {
    let i = 0;

    function process(isTopLevel: boolean): (Token | Node)[] {
        const result: (Token | Node)[] = [];
        while (i < tokens.length) {
            const token = tokens[i];
            if (token.value === '(' || token.value === '[' || token.value === '{' || token.value === '[?' || token.value === '{?') {
                const open = token.value;
                let close = '}';
                if (open === '(') close = ')';
                else if (open === '[' || open === '[?') close = ']';

                i++;
                const content = process(false);
                result.push({
                    type: 'group',
                    tokens: content,
                    open,
                    close
                });
            } else if (token.value === ')' || token.value === ']' || token.value === '}') {
                if (isTopLevel) {
                    result.push(token);
                    i++;
                } else {
                    i++;
                    return result;
                }
            } else {
                result.push(token);
                i++;
            }
        }
        return result;
    }

    return process(true);
}

export function renderFlat(items: (Token | Node)[]): string {
    const raw = items.map(item => {
        if ('type' in item && item.type === 'group') {
            return item.open + renderFlat(item.tokens) + item.close;
        }
        const t = item as Token;
        if (t.type === 'comment') return '\n' + t.value.trim() + '\n';
        if (t.type === 'colon') return ': ';
        if (t.type === 'ternary_colon') return ' : ';
        if (t.type === 'operator') return ` ${t.value} `;
        if (t.type === 'unary_operator') return t.value;
        if (t.value === ',') {
            return ', ';
        }
        return t.value;
    }).join('');

    return raw.split('\n')
        .map(l => l.trim())
        .filter(l => l !== '')
        .join('\n');
}

function greedyRender(items: (Token | Node)[], depth: number, minPrio = 1, parentGroup = ''): string {
    if (items.length === 0) return '';
    const indent = '  '.repeat(depth);

    const renderFlatTokens = (itms: (Token | Node)[]): string => {
        return itms.map(item => {
            if ('type' in item && item.type === 'group') {
                return item.open + renderFlatTokens(item.tokens) + item.close;
            }
            const t = item as Token;
            if (t.type === 'comment') return '\n' + indent + t.value.trim() + '\n' + indent;
            if (t.type === 'colon') return ': ';
            if (t.type === 'ternary_colon') return ' : ';
            if (t.type === 'operator') return ` ${t.value} `;
            if (t.type === 'unary_operator') return t.value;
            if (t.value === ',') return ', ';
            return t.value;
        }).join('').trim();
    };

    let flat = renderFlatTokens(items);

    // Clean up contiguous comments
    flat = flat.replace(/\n\s*\n\s*\/\//g, '\n' + indent + '//');

    const lines = flat.split('\n');
    const maxLineLen = Math.max(...lines.map(l => l.length));

    if (maxLineLen + indent.length <= 80) {
        return flat;
    }

    const tryFallback = (): string => {
        let result = '';
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if ('type' in it && it.type === 'group') {
                const node = it as Node;
                if (node.open === '(') {
                    let innerInline = greedyRender(node.tokens, depth + 2, 1, node.open).trim();
                    const fakeResult = result + node.open + innerInline + node.close;
                    const lines = fakeResult.split('\n');
                    const maxLen = Math.max(...lines.map(l => l.length));
                    if (maxLen <= 84) {
                        result += node.open + innerInline + node.close;
                    } else {
                        const inner = greedyRender(node.tokens, depth + 2, 1, node.open).trim();
                        result += node.open + (inner ? '\n' + '  '.repeat(depth + 2) + inner : '') + node.close;
                    }
                } else {
                    const inner = greedyRender(node.tokens, depth + 1, 1, node.open).trim();
                    result += node.open + (inner ? '\n' + '  '.repeat(depth + 1) + inner + '\n' + indent : '') + node.close;
                }
            } else {
                const t = it as Token;
                if (t.type === 'comment') {
                    if (result && !result.endsWith('\n') && !result.endsWith(' ')) result += ' ';
                    result += t.value.trim() + '\n' + indent;
                } else if (t.type === 'colon') {
                    result += ': ';
                } else if (t.type === 'ternary_colon') {
                    result += ' : ';
                } else if (t.type === 'operator') {
                    result += ` ${t.value} `;
                } else if (t.type === 'unary_operator') {
                    result += t.value;
                } else if (t.value === ',') {
                    result += ', ';
                } else {
                    result += t.value;
                }
            }
        }
        const resString = result.replace(/\n\s*\n\s*\/\//g, '\n' + indent + '//').trim();
        return resString;
    };

    const findPoints = (prio: number) => {
        const res: { idx: number, before: boolean }[] = [];
        let dotCount = 0;
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (!('tokens' in it)) {
                const t = it as Token;
                if (prio === 1 && (t.value === '&&' || t.value === '||')) res.push({ idx: i, before: false });
                if (prio === 2 && ['==', '!=', '<', '>', '<=', '>=', 'in'].includes(t.value)) res.push({ idx: i, before: false });
                if (prio === 3 && t.value === ',') res.push({ idx: i, before: false });
                if (prio === 4 && t.type === 'dot' && i > 0) {
                    dotCount++;
                    if (dotCount > 1) res.push({ idx: i, before: true });
                }
            }
        }
        return res;
    };


    for (let p = minPrio; p <= 4; p++) {
        const points = findPoints(p);
        if (points.length > 0) {
            const parts: (Token | Node)[][] = [];
            let last = 0;
            for (const pt of points) {
                const end = pt.before ? pt.idx : pt.idx + 1;
                if (end > last) {
                    parts.push(items.slice(last, end));
                    last = end;
                }
            }
            if (last < items.length) {
                parts.push(items.slice(last));
            }

            // If splitting by comma, pack as many as possible per line
            if (p === 3) {
                const linesRes: string[] = [];
                let currentLine = '';
                for (let i = 0; i < parts.length; i++) {
                    const renderedPart = greedyRender(parts[i], depth, p + 1, parentGroup).trim();
                    const firstLineLen = renderedPart.split('\n')[0].length;
                    if (currentLine.length + firstLineLen + indent.length + 1 > 80 && currentLine.length > 0) {
                        linesRes.push(currentLine.trim());
                        currentLine = renderedPart;
                    } else {
                        currentLine += (currentLine ? ' ' : '') + renderedPart;
                    }
                }
                if (currentLine) {
                    linesRes.push(currentLine.trim());
                }
                return linesRes.map((line, i) => i === 0 ? line : '  '.repeat(depth) + line).join('\n');
            }

            return parts.map((part, i) => {
                const d = p === 1 || p === 2 || (p === 4 && i > 0) ? depth + 2 : depth;
                let res = greedyRender(part, d, p + 1, parentGroup);
                return i === 0 ? res : '\n' + '  '.repeat(d) + res.trimStart();
            }).join('');
        }
    }

    return tryFallback();
}

function wrapCommentText(comments: string[], indent: string): string {
    const lines = comments.join('\n').split('\n').map(l => l.replace(/^\s*\/\/\s?/, '').trim());
    const words = lines.join(' ').split(/\s+/).filter(w => w.length > 0);

    const maxLen = 80 - indent.length - 3; // "// "
    const outLines: string[] = [];
    let curLine = '';
    for (const w of words) {
        if (curLine.length + w.length + (curLine.length > 0 ? 1 : 0) > maxLen) {
            if (curLine.length > 0) outLines.push(curLine);
            curLine = w;
        } else {
            curLine += (curLine.length > 0 ? ' ' : '') + w;
        }
    }
    if (curLine.length > 0) outLines.push(curLine);
    else if (words.length === 0) outLines.push('');

    return outLines.map(l => '// ' + l).join('\n' + indent);
}

function mergeAndWrapComments(items: (Token | Node)[], depth: number): (Token | Node)[] {
    const res: (Token | Node)[] = [];
    let commentGroup: string[] = [];
    const indent = '  '.repeat(depth);

    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if ('type' in it && it.type === 'group') {
            if (commentGroup.length > 0) {
                res.push({ type: 'comment', value: wrapCommentText(commentGroup, indent) });
                commentGroup = [];
            }
            const node = it as Node;
            res.push({ ...node, tokens: mergeAndWrapComments(node.tokens, depth + 1) });
        } else {
            const t = it as Token;
            if (t.type === 'comment') {
                commentGroup.push(t.value);
            } else {
                if (commentGroup.length > 0) {
                    res.push({ type: 'comment', value: wrapCommentText(commentGroup, indent) });
                    commentGroup = [];
                }
                res.push(t);
            }
        }
    }
    if (commentGroup.length > 0) {
        res.push({ type: 'comment', value: wrapCommentText(commentGroup, indent) });
    }
    return res;
}

export function formatCEL(expression: string): string {
    if (!expression || expression.trim() === '') return '';
    const tokens = tokenize(expression);
    const tree = parse(tokens);
    const wrappedTree = mergeAndWrapComments(tree, 0);
    return greedyRender(wrappedTree, 0).trim();
}
