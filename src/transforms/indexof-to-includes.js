module.exports = (file, api, options) => {
    const j = api.jscodeshift;

    const printOptions = options.printOptions || {quote: 'single'};
    const root = j(file.source);

    function simplifyLeftSideIndexOf(node) {
        const rightHandIsNegativeOne =
            j(node).find(j.UnaryExpression, {
                operator: '-',
                argument: {
                    type: 'Literal',
                    value: 1
                }
            }).length === 1;
        const rightHandIsZero = j(node).find(j.Literal, {value: 0}).length === 1;
        if (rightHandIsNegativeOne || rightHandIsZero) {
            const {left} = node;
            const includesNode = j.callExpression(
                j.memberExpression(left.callee.object, j.identifier('includes')),
                left.arguments
            );
            const notIncludesNode = j.unaryExpression('!', includesNode);
            if (rightHandIsNegativeOne) {
                switch (node.operator) {
                    case '==':
                    case '===':
                        return notIncludesNode;
                    case '!=':
                    case '!==':
                    case '>':
                        return includesNode;
                    default:
                        return node;
                }
            } else if (rightHandIsZero) {
                switch (node.operator) {
                    case '<':
                        return notIncludesNode;
                    case '>=':
                        return includesNode;
                    default:
                        return node;
                }
            }
        }
        return node;
    }

    const indexOfCallExpression = {
        type: 'CallExpression',
        callee: {
            type: 'MemberExpression',
            property: {
                type: 'Identifier',
                name: 'indexOf'
            }
        }
    };

    root.find(j.BinaryExpression, {
        left: indexOfCallExpression
    }).replaceWith(path => simplifyLeftSideIndexOf(path.node));

    return root.toSource(printOptions);
};
