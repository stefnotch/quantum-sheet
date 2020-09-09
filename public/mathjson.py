"""
A Printer which converts an expression into its MathJson equivalent.
"""

from sympy.core import S, Rational, Pow, Basic, Mul, Number
from sympy.core.mul import _keep_coeff
from sympy.printing.printer import Printer
from sympy.printing.precedence import precedence, PRECEDENCE

from mpmath.libmp import prec_to_dps, to_str as mlib_to_str

from sympy.utilities import default_sort_key

# TODO: Update the ones maked with "# TODO: Important Update"

class MathJsonPrinter(Printer):
    printmethod = "_mathjson"
    _default_settings = {
        "order": None,
        "full_prec": "auto",
        "perm_cyclic": True,
        "min": None,
        "max": None,
    }

    _relationals = dict()

    def _quotes(self, text):
        return '"%s"' % text

    def _function(self, name, args, requires_multiple_args=False):
        if requires_multiple_args and len(args) == 1:
            return str(args[0])
        else:
            return "[\"%s\",%s]" % (name, ','.join(args))

    # TODO: Update
    def parenthesize(self, item, level, strict=False):
        print("Warning: parenthesize was called")
        return "(%s)" % self._print(item)

    # TODO: Update
    def stringify(self, args, sep, level=0):
        print("Warning: stringify was called")
        return sep.join([self.parenthesize(item, level) for item in args])

    def emptyPrinter(self, expr):
        if isinstance(expr, str):
            return expr
        elif isinstance(expr, Basic):
            return repr(expr)
        else:
            return str(expr)

    def _print_Add(self, expr, order=None):
        terms = self._as_ordered_terms(expr, order=order)
        l = []
        for term in terms:
            l.append(self._print(term))
        return self._function('Add', l, True)

    # TODO: Update
    def _print_BooleanTrue(self, expr):
        print("Warning: _print_BooleanTrue was called")
        return "True"

    # TODO: Update
    def _print_BooleanFalse(self, expr):
        print("Warning: _print_BooleanFalse was called")
        return "False"

    # TODO: Update
    def _print_Not(self, expr):
        print("Warning: _print_Not was called")
        return '~%s' %(self.parenthesize(expr.args[0],PRECEDENCE["Not"]))

    # TODO: Update
    def _print_And(self, expr):
        print("Warning: _print_And was called")
        return self.stringify(expr.args, " & ", PRECEDENCE["BitwiseAnd"])

    # TODO: Update
    def _print_Or(self, expr):
        print("Warning: _print_Or was called")
        return self.stringify(expr.args, " | ", PRECEDENCE["BitwiseOr"])

    # TODO: Update
    def _print_Xor(self, expr):
        print("Warning: _print_Xor was called")
        return self.stringify(expr.args, " ^ ", PRECEDENCE["BitwiseXor"])

    # TODO: Update
    def _print_AppliedPredicate(self, expr):
        print("Warning: _print_AppliedPredicate was called")
        return '%s(%s)' % (self._print(expr.func), self._print(expr.arg))

    # TODO: Update
    def _print_Basic(self, expr):
        print("Warning: _print_Basic was called")
        l = [self._print(o) for o in expr.args]
        return expr.__class__.__name__ + "(%s)" % ", ".join(l)

    # TODO: Update
    def _print_BlockMatrix(self, B):
        print("Warning: _print_BlockMatrix was called")
        if B.blocks.shape == (1, 1):
            self._print(B.blocks[0, 0])
        return self._print(B.blocks)

    # TODO: Update
    def _print_Catalan(self, expr):
        print("Warning: _print_Catalan was called")
        return 'Catalan'

    # TODO: Update
    def _print_ComplexInfinity(self, expr):
        print("Warning: _print_ComplexInfinity was called")
        return 'zoo'

    # TODO: Update
    def _print_ConditionSet(self, s):
        print("Warning: _print_ConditionSet was called")
        args = tuple([self._print(i) for i in (s.sym, s.condition)])
        if s.base_set is S.UniversalSet:
            return 'ConditionSet(%s, %s)' % args
        args += (self._print(s.base_set),)
        return 'ConditionSet(%s, %s, %s)' % args

    # TODO: Update
    def _print_Derivative(self, expr):
        print("Warning: _print_Derivative was called")
        dexpr = expr.expr
        dvars = [i[0] if i[1] == 1 else i for i in expr.variable_count]
        return 'Derivative(%s)' % ", ".join(map(lambda arg: self._print(arg), [dexpr] + dvars))

    # TODO: Update
    def _print_dict(self, d):
        print("Warning: _print_dict was called")
        keys = sorted(d.keys(), key=default_sort_key)
        items = []

        for key in keys:
            item = "%s: %s" % (self._print(key), self._print(d[key]))
            items.append(item)

        return "{%s}" % ", ".join(items)

    # TODO: Update
    def _print_Dict(self, expr):
        print("Warning: _print_Dict was called")
        return self._print_dict(expr)

    # TODO: Update
    def _print_RandomDomain(self, d):
        print("Warning: _print_RandomDomain was called")
        if hasattr(d, 'as_boolean'):
            return 'Domain: ' + self._print(d.as_boolean())
        elif hasattr(d, 'set'):
            return ('Domain: ' + self._print(d.symbols) + ' in ' +
                    self._print(d.set))
        else:
            return 'Domain on ' + self._print(d.symbols)

    def _print_Dummy(self, expr):
        return self._quotes('_' + expr.name)

    # TODO: Important Update
    def _print_EulerGamma(self, expr):
        print("Warning: _print_EulerGamma was called")
        return 'EulerGamma'

    # TODO: Important Update
    def _print_Exp1(self, expr):
        print("Warning: _print_Exp1 was called")
        return 'E'

    # TODO: Update
    def _print_ExprCondPair(self, expr):
        print("Warning: _print_ExprCondPair was called")
        return '(%s, %s)' % (self._print(expr.expr), self._print(expr.cond))

    # TODO: Update
    def _print_Function(self, expr):
        print("Warning: _print_Function was called")
        return expr.func.__name__ + "(%s)" % self.stringify(expr.args, ", ")

    # TODO: Update
    def _print_GoldenRatio(self, expr):
        print("Warning: _print_GoldenRatio was called")
        return 'GoldenRatio'

    # TODO: Update
    def _print_TribonacciConstant(self, expr):
        print("Warning: _print_TribonacciConstant was called")
        return 'TribonacciConstant'

    # TODO: Important Update
    def _print_ImaginaryUnit(self, expr):
        print("Warning: _print_ImaginaryUnit was called")
        return '"I"'

    # TODO: Important Update
    def _print_Infinity(self, expr):
        print("Warning: _print_Infinity was called")
        return 'oo'

    # TODO: Update
    def _print_Integral(self, expr):
        print("Warning: _print_Integral was called")
        # TODO: Update
        def _xab_tostr(xab):
            if len(xab) == 1:
                return self._print(xab[0])
            else:
                return self._print((xab[0],) + tuple(xab[1:]))
        L = ', '.join([_xab_tostr(l) for l in expr.limits])
        return 'Integral(%s, %s)' % (self._print(expr.function), L)

    # TODO: Update
    def _print_Interval(self, i):
        print("Warning: _print_Interval was called")
        fin =  'Interval{m}({a}, {b})'
        a, b, l, r = i.args
        if a.is_infinite and b.is_infinite:
            m = ''
        elif a.is_infinite and not r:
            m = ''
        elif b.is_infinite and not l:
            m = ''
        elif not l and not r:
            m = ''
        elif l and r:
            m = '.open'
        elif l:
            m = '.Lopen'
        else:
            m = '.Ropen'
        return fin.format(**{'a': a, 'b': b, 'm': m})

    # TODO: Update
    def _print_AccumulationBounds(self, i):
        print("Warning: _print_AccumulationBounds was called")
        return "AccumBounds(%s, %s)" % (self._print(i.min),
                                        self._print(i.max))

    # TODO: Update
    def _print_Inverse(self, I):
        print("Warning: _print_Inverse was called")
        return "%s**(-1)" % self.parenthesize(I.arg, PRECEDENCE["Pow"])

    # TODO: Update
    def _print_Lambda(self, obj):
        print("Warning: _print_Lambda was called")
        expr = obj.expr
        sig = obj.signature
        if len(sig) == 1 and sig[0].is_symbol:
            sig = sig[0]
        return "Lambda(%s, %s)" % (self._print(sig), self._print(expr))

    # TODO: Update
    def _print_LatticeOp(self, expr):
        print("Warning: _print_LatticeOp was called")
        args = sorted(expr.args, key=default_sort_key)
        return expr.func.__name__ + "(%s)" % ", ".join(self._print(arg) for arg in args)

    # TODO: Update
    def _print_Limit(self, expr):
        print("Warning: _print_Limit was called")
        e, z, z0, dir = expr.args
        if str(dir) == "+":
            return "Limit(%s, %s, %s)" % tuple(map(self._print, (e, z, z0)))
        else:
            return "Limit(%s, %s, %s, dir='%s')" % tuple(map(self._print,
                                                            (e, z, z0, dir)))

    # TODO: Update
    def _print_list(self, expr):
        return self._function("List", [self._print(item) for item in expr], True)

    # TODO: Update
    def _print_MatrixBase(self, expr):
        print("Warning: _print_MatrixBase was called")
        return expr._format_str(self)

    # TODO: Update
    def _print_MatrixElement(self, expr):
        print("Warning: _print_MatrixElement was called")
        return self.parenthesize(expr.parent, PRECEDENCE["Atom"], strict=True) \
            + '[%s, %s]' % (self._print(expr.i), self._print(expr.j))

    # TODO: Update
    def _print_MatrixSlice(self, expr):
        print("Warning: _print_MatrixSlice was called")
        # TODO: Update
        def strslice(x, dim):
            x = list(x)
            if x[2] == 1:
                del x[2]
            if x[0] == 0:
                x[0] = ''
            if x[1] == dim:
                x[1] = ''
            return ':'.join(map(lambda arg: self._print(arg), x))
        return (self.parenthesize(expr.parent, PRECEDENCE["Atom"], strict=True) + '[' +
                strslice(expr.rowslice, expr.parent.rows) + ', ' +
                strslice(expr.colslice, expr.parent.cols) + ']')

    # TODO: Update
    def _print_DeferredVector(self, expr):
        print("Warning: _print_DeferredVector was called")
        return expr.name

    def _print_Mul(self, expr):
        # Check for unevaluated Mul. In this case we need to make sure the
        # identities are visible, multiple Rational factors are not combined
        # etc so we display in a straight-forward form that fully preserves all
        # args and their order.
        args = expr.args
        if args[0] is S.One or any(isinstance(arg, Number) for arg in args[1:]):
            factors = [self._print(a) for a in args]
            return self._function('Multiply', factors)

        a = []  # items in the numerator
        b = []  # items that are in the denominator (if any)

        if self.order not in ('old', 'none'):
            args = expr.as_ordered_factors()
        else:
            # use make_args in case expr was something like -x -> x
            args = Mul.make_args(expr)

        # Gather args for numerator/denominator
        for item in args:
            if item.is_commutative and item.is_Pow and item.exp.is_Rational and item.exp.is_negative:
                if item.exp != -1:
                    b.append(Pow(item.base, -item.exp, evaluate=False))
                else:
                    b.append(Pow(item.base, -item.exp))
            elif item.is_Rational and item is not S.Infinity:
                if item.p != 1:
                    a.append(Rational(item.p))
                if item.q != 1:
                    b.append(Rational(item.q))
            else:
                a.append(item)

        a = a or [S.One]

        a_str = [self._print(x) for x in a]
        b_str = [self._print(x) for x in b]

        if not b:
            return self._function('Multiply', a_str, True)
        else:
            # TODO: Should a*b/(c*d) be a*(b/(c*d)) or (a*b)/(c*d) ?
            return self._function('Divide', [
                self._function('Multiply', a_str, True), 
                self._function('Multiply', b_str, True)
            ])

    # TODO: Update
    def _print_MatMul(self, expr):
        print("Warning: _print_MatMul was called")
        c, m = expr.as_coeff_mmul()

        sign = ""
        if c.is_number:
            re, im = c.as_real_imag()
            if im.is_zero and re.is_negative:
                expr = _keep_coeff(-c, m)
                sign = "-"
            elif re.is_zero and im.is_negative:
                expr = _keep_coeff(-c, m)
                sign = "-"

        return sign + '*'.join(
            [self.parenthesize(arg, precedence(expr)) for arg in expr.args]
        )

    # TODO: Update
    def _print_ElementwiseApplyFunction(self, expr):
        print("Warning: _print_ElementwiseApplyFunction was called")
        return "{0}.({1})".format(
            expr.function,
            self._print(expr.expr),
        )

    # TODO: Important Update
    def _print_NaN(self, expr):
        print("Warning: _print_NaN was called")
        return 'nan'

    # TODO: Important Update
    def _print_NegativeInfinity(self, expr):
        print("Warning: _print_NegativeInfinity was called")
        return '-oo'

    # TODO: Update
    def _print_Order(self, expr):
        print("Warning: _print_Order was called")
        if not expr.variables or all(p is S.Zero for p in expr.point):
            if len(expr.variables) <= 1:
                return 'O(%s)' % self._print(expr.expr)
            else:
                return 'O(%s)' % self.stringify((expr.expr,) + expr.variables, ', ', 0)
        else:
            return 'O(%s)' % self.stringify(expr.args, ', ', 0)

    # TODO: Update
    def _print_Ordinal(self, expr):
        print("Warning: _print_Ordinal was called")
        return expr.__str__()

    # TODO: Update
    def _print_Cycle(self, expr):
        print("Warning: _print_Cycle was called")
        return expr.__str__()

    # TODO: Update
    def _print_Permutation(self, expr):
        print("Warning: _print_Permutation was called")
        from sympy.combinatorics.permutations import Permutation, Cycle
        from sympy.utilities.exceptions import SymPyDeprecationWarning

        perm_cyclic = Permutation.print_cyclic
        if perm_cyclic is not None:
            SymPyDeprecationWarning(
                feature="Permutation.print_cyclic = {}".format(perm_cyclic),
                useinstead="init_printing(perm_cyclic={})"
                .format(perm_cyclic),
                issue=15201,
                deprecated_since_version="1.6").warn()
        else:
            perm_cyclic = self._settings.get("perm_cyclic", True)

        if perm_cyclic:
            if not expr.size:
                return '()'
            # before taking Cycle notation, see if the last element is
            # a singleton and move it to the head of the string
            s = Cycle(expr)(expr.size - 1).__repr__()[len('Cycle'):]
            last = s.rfind('(')
            if not last == 0 and ',' not in s[last:]:
                s = s[last:] + s[:last]
            s = s.replace(',', '')
            return s
        else:
            s = expr.support()
            if not s:
                if expr.size < 5:
                    return 'Permutation(%s)' % self._print(expr.array_form)
                return 'Permutation([], size=%s)' % self._print(expr.size)
            trim = self._print(expr.array_form[:s[-1] + 1]) + ', size=%s' % self._print(expr.size)
            use = full = self._print(expr.array_form)
            if len(trim) < len(full):
                use = trim
            return 'Permutation(%s)' % use

    # TODO: Update
    def _print_Subs(self, obj):
        print("Warning: _print_Subs was called")
        expr, old, new = obj.args
        if len(obj.point) == 1:
            old = old[0]
            new = new[0]
        return "Subs(%s, %s, %s)" % (
            self._print(expr), self._print(old), self._print(new))

    # TODO: Update
    def _print_TensorIndex(self, expr):
        print("Warning: _print_TensorIndex was called")
        return expr._print()

    # TODO: Update
    def _print_TensorHead(self, expr):
        print("Warning: _print_TensorHead was called")
        return expr._print()

    # TODO: Update
    def _print_Tensor(self, expr):
        print("Warning: _print_Tensor was called")
        return expr._print()

    # TODO: Update
    def _print_TensMul(self, expr):
        print("Warning: _print_TensMul was called")
        # prints expressions like "A(a)", "3*A(a)", "(1+x)*A(a)"
        sign, args = expr._get_args_for_traditional_printer()
        return sign + "*".join(
            [self.parenthesize(arg, precedence(expr)) for arg in args]
        )

    # TODO: Update
    def _print_TensAdd(self, expr):
        print("Warning: _print_TensAdd was called")
        return expr._print()

    # TODO: Update
    def _print_PermutationGroup(self, expr):
        print("Warning: _print_PermutationGroup was called")
        p = ['    %s' % self._print(a) for a in expr.args]
        return 'PermutationGroup([%s])' % ','.join(p)

    # TODO: Important Update
    def _print_Pi(self, expr):
        print("Warning: _print_Pi was called")
        return 'pi'

    # TODO: Update
    def _print_PolyRing(self, ring):
        print("Warning: _print_PolyRing was called")
        return "Polynomial ring in %s over %s with %s order" % \
            (", ".join(map(lambda rs: self._print(rs), ring.symbols)),
            self._print(ring.domain), self._print(ring.order))

    # TODO: Update
    def _print_FracField(self, field):
        print("Warning: _print_FracField was called")
        return "Rational function field in %s over %s with %s order" % \
            (", ".join(map(lambda fs: self._print(fs), field.symbols)),
            self._print(field.domain), self._print(field.order))

    # TODO: Update
    def _print_FreeGroupElement(self, elm):
        print("Warning: _print_FreeGroupElement was called")
        return elm.__str__()

    # TODO: Update
    def _print_GaussianElement(self, poly):
        print("Warning: _print_GaussianElement was called")
        return "(%s + %s*I)" % (poly.x, poly.y)

    # TODO: Update
    def _print_PolyElement(self, poly):
        print("Warning: _print_PolyElement was called")
        return poly.str(self, PRECEDENCE, "%s**%s", "*")

    # TODO: Update
    def _print_FracElement(self, frac):
        print("Warning: _print_FracElement was called")
        if frac.denom == 1:
            return self._print(frac.numer)
        else:
            numer = self.parenthesize(frac.numer, PRECEDENCE["Mul"], strict=True)
            denom = self.parenthesize(frac.denom, PRECEDENCE["Atom"], strict=True)
            return numer + "/" + denom

    # TODO: Update
    def _print_Poly(self, expr):
        print("Warning: _print_Poly was called")
        ATOM_PREC = PRECEDENCE["Atom"] - 1
        terms, gens = [], [ self.parenthesize(s, ATOM_PREC) for s in expr.gens ]

        for monom, coeff in expr.terms():
            s_monom = []

            for i, exp in enumerate(monom):
                if exp > 0:
                    if exp == 1:
                        s_monom.append(gens[i])
                    else:
                        s_monom.append(gens[i] + "**%d" % exp)

            s_monom = "*".join(s_monom)

            if coeff.is_Add:
                if s_monom:
                    s_coeff = "(" + self._print(coeff) + ")"
                else:
                    s_coeff = self._print(coeff)
            else:
                if s_monom:
                    if coeff is S.One:
                        terms.extend(['+', s_monom])
                        continue

                    if coeff is S.NegativeOne:
                        terms.extend(['-', s_monom])
                        continue

                s_coeff = self._print(coeff)

            if not s_monom:
                s_term = s_coeff
            else:
                s_term = s_coeff + "*" + s_monom

            if s_term.startswith('-'):
                terms.extend(['-', s_term[1:]])
            else:
                terms.extend(['+', s_term])

        if terms[0] in ['-', '+']:
            modifier = terms.pop(0)

            if modifier == '-':
                terms[0] = '-' + terms[0]

        format = expr.__class__.__name__ + "(%s, %s"

        from sympy.polys.polyerrors import PolynomialError

        try:
            format += ", modulus=%s" % expr.get_modulus()
        except PolynomialError:
            format += ", domain='%s'" % expr.get_domain()

        format += ")"

        for index, item in enumerate(gens):
            if len(item) > 2 and (item[:1] == "(" and item[len(item) - 1:] == ")"):
                gens[index] = item[1:len(item) - 1]

        return format % (' '.join(terms), ', '.join(gens))

    # TODO: Update
    def _print_UniversalSet(self, p):
        print("Warning: _print_UniversalSet was called")
        return 'UniversalSet'

    # TODO: Update
    def _print_AlgebraicNumber(self, expr):
        print("Warning: _print_AlgebraicNumber was called")
        if expr.is_aliased:
            return self._print(expr.as_poly().as_expr())
        else:
            return self._print(expr.as_expr())

    def _print_Pow(self, expr, rational=False):
        if expr.exp is S.Half and not rational:
            return self._function('Sqrt', [self._print(expr.base)])

        if expr.is_commutative:
            if -expr.exp is S.Half and not rational:
                # Note: Don't test "expr.exp == -S.Half" here, because that will
                # match -0.5, which we don't want.
                return self._function('Divide', [
                    self._print(S.One), 
                    self._function('Sqrt', [self._print(expr.base)])
                ])
            if expr.exp is -S.One:
                # Similarly to the S.Half case, don't test with "==" here.
                 return self._function('Divide', [
                    self._print(S.One),
                    self._print(expr.base)
                ])
                
        return self._function('Power', [self._print(expr.base), self._print(expr.exp)])

    # TODO: Update
    def _print_UnevaluatedExpr(self, expr):
        print("Warning: _print_UnevaluatedExpr was called")
        return self._print(expr.args[0])

    # TODO: Update
    def _print_MatPow(self, expr):
        print("Warning: _print_MatPow was called")
        PREC = precedence(expr)
        return '%s**%s' % (self.parenthesize(expr.base, PREC, strict=False),
                         self.parenthesize(expr.exp, PREC, strict=False))

    def _print_Integer(self, expr):
        return str(expr.p)

    # TODO: Update
    def _print_Integers(self, expr):
        print("Warning: _print_Integers was called")
        return 'Integers'

    # TODO: Update
    def _print_Naturals(self, expr):
        print("Warning: _print_Naturals was called")
        return 'Naturals'

    # TODO: Update
    def _print_Naturals0(self, expr):
        print("Warning: _print_Naturals0 was called")
        return 'Naturals0'

    # TODO: Update
    def _print_Rationals(self, expr):
        print("Warning: _print_Rationals was called")
        return 'Rationals'

    # TODO: Update
    def _print_Reals(self, expr):
        print("Warning: _print_Reals was called")
        return 'Reals'

    # TODO: Update
    def _print_Complexes(self, expr):
        print("Warning: _print_Complexes was called")
        return 'Complexes'

    # TODO: Update
    def _print_EmptySet(self, expr):
        print("Warning: _print_EmptySet was called")
        return 'EmptySet'

    # TODO: Update
    def _print_EmptySequence(self, expr):
        print("Warning: _print_EmptySequence was called")
        return 'EmptySequence'

    # TODO: Update
    def _print_int(self, expr):
        print("Warning: _print_int was called")
        return str(expr)

    # TODO: Update
    def _print_mpz(self, expr):
        print("Warning: _print_mpz was called")
        return str(expr)

    def _print_Rational(self, expr):
        if expr.q == 1:
            return str(expr.p)
        else:
            return self._function('Divide', [str(expr.p), str(expr.q)])

    def _print_PythonRational(self, expr):
        if expr.q == 1:
            return str(expr.p)
        else:
            return self._function('Divide', [str(expr.p), str(expr.q)])

    def _print_Fraction(self, expr):
        if expr.denominator == 1:
            return str(expr.numerator)
        else:
            return self._function('Divide', [str(expr.numerator), str(expr.denominator)])

    def _print_mpq(self, expr):
        if expr.denominator == 1:
            return str(expr.numerator)
        else:
            return self._function('Divide', [str(expr.numerator), str(expr.denominator)])

    def _print_Float(self, expr):
        # Precision
        prec = expr._prec
        if prec < 5:
            dps = 0
        else:
            dps = prec_to_dps(expr._prec)
        if self._settings["full_prec"] is True:
            strip = False
        elif self._settings["full_prec"] is False:
            strip = True
        elif self._settings["full_prec"] == "auto":
            strip = self._print_level > 1
        low = self._settings["min"] if "min" in self._settings else None
        high = self._settings["max"] if "max" in self._settings else None
        rv = mlib_to_str(expr._mpf_, dps, strip_zeros=strip, min_fixed=low, max_fixed=high)
        if rv.startswith('-.0'):
            rv = '-0.' + rv[3:]
        elif rv.startswith('.0'):
            rv = '0.' + rv[2:]
        if rv.startswith('+'):
            # e.g., +inf -> inf
            rv = rv[1:]
        return rv

    def _print_Relational(self, expr):

        charmap = {
            "==": "EqualEqual",
            "!=": "Unequal",
            ":=": "Assign",
            '+=': "PlusEqual",
            "-=": "MinusEqual",
            "*=": "StarEqual",
            # "/=": "DivAugmentedAssignment",
            # "%=": "ModAugmentedAssignment",
        }

        if expr.rel_op in charmap:
            return self._function(charmap[expr.rel_op], [self._print(expr.lhs), self._print(expr.rhs)])

        print("Warning: _print_Relational was called")
        return '%s %s %s' % (self.parenthesize(expr.lhs, precedence(expr)),
                           self._relationals.get(expr.rel_op) or expr.rel_op,
                           self.parenthesize(expr.rhs, precedence(expr)))

    # TODO: Update
    def _print_ComplexRootOf(self, expr):
        print("Warning: _print_ComplexRootOf was called")
        return "CRootOf(%s, %d)" % (self._print_Add(expr.expr,  order='lex'),
                                    expr.index)

    # TODO: Update
    def _print_RootSum(self, expr):
        print("Warning: _print_RootSum was called")
        args = [self._print_Add(expr.expr, order='lex')]

        if expr.fun is not S.IdentityFunction:
            args.append(self._print(expr.fun))

        return "RootSum(%s)" % ", ".join(args)

    # TODO: Update
    def _print_GroebnerBasis(self, basis):
        print("Warning: _print_GroebnerBasis was called")
        cls = basis.__class__.__name__

        exprs = [self._print_Add(arg, order=basis.order) for arg in basis.exprs]
        exprs = "[%s]" % ", ".join(exprs)

        gens = [ self._print(gen) for gen in basis.gens ]
        domain = "domain='%s'" % self._print(basis.domain)
        order = "order='%s'" % self._print(basis.order)

        args = [exprs] + gens + [domain, order]

        return "%s(%s)" % (cls, ", ".join(args))

    # TODO: Update
    def _print_set(self, s):
        print("Warning: _print_set was called")
        items = sorted(s, key=default_sort_key)

        args = ', '.join(self._print(item) for item in items)
        if not args:
            return "set()"
        return '{%s}' % args

    # TODO: Update
    def _print_frozenset(self, s):
        print("Warning: _print_frozenset was called")
        if not s:
            return "frozenset()"
        return "frozenset(%s)" % self._print_set(s)

    # TODO: Update
    def _print_Sum(self, expr):
        print("Warning: _print_Sum was called")
        # TODO: Update
        def _xab_tostr(xab):
            if len(xab) == 1:
                return self._print(xab[0])
            else:
                return self._print((xab[0],) + tuple(xab[1:]))
        L = ', '.join([_xab_tostr(l) for l in expr.limits])
        return 'Sum(%s, %s)' % (self._print(expr.function), L)

    def _print_Symbol(self, expr):
        return self._quotes(expr.name)
    _print_MatrixSymbol = _print_Symbol
    _print_RandomSymbol = _print_Symbol

    # TODO: Update
    def _print_Identity(self, expr):
        print("Warning: _print_Identity was called")
        return "I"

    # TODO: Update
    def _print_ZeroMatrix(self, expr):
        print("Warning: _print_ZeroMatrix was called")
        return "0"

    # TODO: Update
    def _print_OneMatrix(self, expr):
        print("Warning: _print_OneMatrix was called")
        return "1"

    # TODO: Update
    def _print_Predicate(self, expr):
        print("Warning: _print_Predicate was called")
        return "Q.%s" % expr.name

    # TODO: Update
    def _print_str(self, expr):
        print("Warning: _print_str was called")
        return str(expr)

    # TODO: Update
    def _print_tuple(self, expr):
        print("Warning: _print_tuple was called")
        if len(expr) == 1:
            return "(%s,)" % self._print(expr[0])
        else:
            return "(%s)" % self.stringify(expr, ", ")

    # TODO: Update
    def _print_Tuple(self, expr):
        print("Warning: _print_Tuple was called")
        return self._print_tuple(expr)

    # TODO: Update
    def _print_Transpose(self, T):
        print("Warning: _print_Transpose was called")
        return "%s.T" % self.parenthesize(T.arg, PRECEDENCE["Pow"])

    # TODO: Update
    def _print_Uniform(self, expr):
        print("Warning: _print_Uniform was called")
        return "Uniform(%s, %s)" % (self._print(expr.a), self._print(expr.b))

    # TODO: Update
    def _print_Quantity(self, expr):
        print("Warning: _print_Quantity was called")
        return "%s" % expr.name

    # TODO: Update
    def _print_Quaternion(self, expr):
        print("Warning: _print_Quaternion was called")
        s = [self.parenthesize(i, PRECEDENCE["Mul"], strict=True) for i in expr.args]
        a = [s[0]] + [i+"*"+j for i, j in zip(s[1:], "ijk")]
        return " + ".join(a)

    # TODO: Update
    def _print_Dimension(self, expr):
        print("Warning: _print_Dimension was called")
        return str(expr)

    # TODO: Update
    def _print_Wild(self, expr):
        print("Warning: _print_Wild was called")
        return expr.name + '_'

    # TODO: Update
    def _print_WildFunction(self, expr):
        print("Warning: _print_WildFunction was called")
        return expr.name + '_'

    # TODO: Update
    def _print_Zero(self, expr):
        print("Warning: _print_Zero was called")
        return "0"

    # TODO: Update
    def _print_DMP(self, p):
        print("Warning: _print_DMP was called")
        from sympy.core.sympify import SympifyError
        try:
            if p.ring is not None:
                # TODO incorporate order
                return self._print(p.ring.to_sympy(p))
        except SympifyError:
            pass

        cls = p.__class__.__name__
        rep = self._print(p.rep)
        dom = self._print(p.dom)
        ring = self._print(p.ring)

        return "%s(%s, %s, %s)" % (cls, rep, dom, ring)

    # TODO: Update
    def _print_DMF(self, expr):
        print("Warning: _print_DMF was called")
        return self._print_DMP(expr)

    # TODO: Update
    def _print_Object(self, obj):
        print("Warning: _print_Object was called")
        return 'Object("%s")' % obj.name

    # TODO: Update
    def _print_IdentityMorphism(self, morphism):
        print("Warning: _print_IdentityMorphism was called")
        return 'IdentityMorphism(%s)' % morphism.domain

    # TODO: Update
    def _print_NamedMorphism(self, morphism):
        print("Warning: _print_NamedMorphism was called")
        return 'NamedMorphism(%s, %s, "%s")' % \
               (morphism.domain, morphism.codomain, morphism.name)

    # TODO: Update
    def _print_Category(self, category):
        print("Warning: _print_Category was called")
        return 'Category("%s")' % category.name

    # TODO: Update
    def _print_Manifold(self, manifold):
        print("Warning: _print_Manifold was called")
        return manifold.name.name

    # TODO: Update
    def _print_Patch(self, patch):
        print("Warning: _print_Patch was called")
        return patch.name.name

    # TODO: Update
    def _print_CoordSystem(self, coords):
        print("Warning: _print_CoordSystem was called")
        return coords.name.name

    # TODO: Update
    def _print_BaseScalarField(self, field):
        print("Warning: _print_BaseScalarField was called")
        return field._coord_sys.symbols[field._index].name

    # TODO: Update
    def _print_BaseVectorField(self, field):
        print("Warning: _print_BaseVectorField was called")
        return 'e_%s' % field._coord_sys.symbols[field._index].name

    # TODO: Update
    def _print_Differential(self, diff):
        print("Warning: _print_Differential was called")
        field = diff._form_field
        if hasattr(field, '_coord_sys'):
            return 'd%s' % field._coord_sys.symbols[field._index].name
        else:
            return 'd(%s)' % self._print(field)

    # TODO: Update
    def _print_Tr(self, expr):
        print("Warning: _print_Tr was called")
        #TODO : Handle indices
        return "%s(%s)" % ("Tr", self._print(expr.args[0]))

    # TODO: Update
    def _print_Str(self, s):
        print("Warning: _print_Str was called")
        return self._print(s.name)