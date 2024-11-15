class Operation {
    static abstractOperation = fun => (...op) => fun(...op);

    constructor(...operands) {
        this.operands = operands;
    }

}

const parseOP = {}

function createOp(operation, n, opSign, diffFunction) {
    class Op extends Operation {
        static operation = operation;
        static opSign = opSign;
        static diffFunction = diffFunction;

        constructor(...operands) {
            super(...operands);
        }

        evaluate(...values) {
            return Operation.abstractOperation(Op.operation)(...this.operands.map(operand => operand.evaluate(...values)));
        }

        toString() {
            return this.operands.map(operand => operand.toString()).join(" ") + " " + Op.opSign;
        }

        diff(variable) {
            return Op.diffFunction(...this.operands.map(operand => operand.diff(variable)).concat(this.operands));
        }
    }

    parseOP[opSign] = [Op, n];
    return Op;
}

function createCompOp(operation, n, opSign, newDiffFunc) {
    class CompOp extends createOp(operation, n, opSign) {
        constructor(...operands) {
            super(...operands);
        }

        diff(variable) {
            return newDiffFunc(...this.operands).diff(variable);
        }
    }

    return CompOp;
}

const Add = createOp((a, b) => a + b, 2, "+", (a_diff, b_diff) => new Add(a_diff, b_diff));
const Subtract = createOp((a, b) => a - b, 2, "-", (a_diff, b_diff) => new Subtract(a_diff, b_diff));
const Multiply = createOp((a, b) => a * b, 2, "*", (a_diff, b_diff, a, b) => new Add(new Multiply(a_diff, b), new Multiply(b_diff, a)));
const Divide = createOp((a, b) => a / b, 2, "/", (a_diff, b_diff, a, b) => new Divide(new Subtract(new Multiply(a_diff, b), new Multiply(b_diff, a)), new Multiply(b, b)));
const Negate = createOp(a => -a, 1, "negate", a_diff => new Negate(a_diff))
const Sqrt = createOp(a => Math.sqrt(a), 1, "sqrt", (a_diff, a) => new Divide(a_diff, new Multiply(new Const(2), new Sqrt(a))))
const Exp = createOp(a => Math.exp(a), 1, "exp", (a_diff, a) => new Multiply(new Exp(a), a_diff));
const Ln = createOp(a => Math.log(a), 1, "ln", (a_diff, a) => new Multiply(new Divide(new Const(1), a), a_diff));

const diffFunctionSumSqN = function (...operands) {
    let Sq = operands.map(operand => new Multiply(operand, operand));
    return SumN(Sq);
}
const diffFunctionDistanceN = function (...operands) {
    return new Sqrt(diffFunctionSumSqN(...operands));
}
const diffFunctionSumrecN = function (...operands) {
    let Rec = operands.map(operand => new Divide(new Const(1), operand));
    return SumN(Rec);
}

const SumN = function (operands) {
    let compOp = new Add(...operands.splice(-2))
    for (const operand of operands) {
        compOp = new Add(compOp, operand);
    }
    return compOp;
}
const diffFunctionHMeanN = function (...operands) {
    return new Divide(new Const(operands.length), diffFunctionSumrecN(...operands));
}
const SumSqN = n => createCompOp((...operands) => operands.reduce((sum, operand) => sum + operand * operand, 0), n, "sumsq" + n, diffFunctionSumSqN);
const [Sumsq2, Sumsq3, Sumsq4, Sumsq5] = [...Array(4).keys()].map(n => SumSqN(n + 2));

const DistanceN = n => createCompOp((...operands) => Math.sqrt(operands.reduce((sum, operand) => sum + operand * operand, 0)), n, "distance" + n, diffFunctionDistanceN)
const [Distance2, Distance3, Distance4, Distance5] = [...Array(4).keys()].map(n => DistanceN(n + 2));

const SumrecN = n => createCompOp((...operands) => operands.reduce((sum, operand) => sum + 1 / operand, 0), n, "sumrec" + n, diffFunctionSumrecN)
const [Sumrec2, Sumrec3, Sumrec4, Sumrec5] = [...Array(4).keys()].map(n => SumrecN(n + 2));

const HMeanN = n => createCompOp((...operands) => n / operands.reduce((sum, operand) => sum + 1 / operand, 0), n, "hmean" + n, diffFunctionHMeanN)
const [HMean2, HMean3, HMean4, HMean5] = [...Array(4).keys()].map(n => HMeanN(n + 2));

class Const {
    constructor(value) {
        this.value = value;
    }

    evaluate() {
        return this.value;
    }

    toString() {
        return this.value.toString();
    }

    diff() {
        return ZERO;
    }
}

const ZERO = new Const(0);
const ONE = new Const(1);

class Variable {
    static variables = {'x': 0, 'y': 1, 'z': 2};

    constructor(variable) {
        this.variable = variable;
        this.variableInd = Variable.variables[variable];
    }

    evaluate(...values) {
        return values[this.variableInd];
    }

    toString() {
        return this.variable;
    }

    diff(variable) {
        return variable === this.variable ? ONE : ZERO;
    }
}

const parseEl = {}

for (const variable in Variable.variables) {
    parseEl[variable] = new Variable(variable);
}


function parse(str) {
    const mass = []
    for (const el of str.trim().split(/\s+/)) {
        let operand;
        if (el in parseEl) {
            operand = parseEl[el];
        } else if (el in parseOP) {
            const operation = parseOP[el];
            const operands = mass.splice(-operation[1]);
            operand = new operation[0](...operands);
        } else {
            operand = new Const(Number.parseFloat(el));
        }
        mass.push(operand);
    }
    return mass.pop();
}
