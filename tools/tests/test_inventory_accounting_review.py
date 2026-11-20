"""Mutation-kill tests for the independent reference model."""
from dataclasses import replace
from decimal import Decimal
import unittest
from tools.inventory_accounting_review import (
    exact, payment_amount, reference_ledger, reference_sale, reference_shift, rounded,
    validate_actor_scope, validate_ledger, validate_sale, validate_shift,
    InvariantViolation, QuantitySnapshot, validate_quantity_mode,
    validate_sale_quantity_snapshot, validate_product_mode_transition,
)

class InventoryAccountingReviewTests(unittest.TestCase):
    def test_numeric_domains_and_float_rejection(self):
        for v,p,s in [("99999999999.999",14,3),("9999999999.9999",14,4),("99999999999999.99",16,2),("9999999999.99999999",18,8)]:
            self.assertEqual(Decimal(v),exact(v,p,s))
        for v,p,s in [("100000000000.000",14,3),("1.0001",14,3),("1.00001",14,4),("10000000000.0000",14,4),("1.001",16,2),("1.000000001",18,8)]:
            with self.subTest(value=v),self.assertRaises(ValueError): exact(v,p,s)
        with self.assertRaises(TypeError): exact(0.1,14,4)
        with self.assertRaises(ValueError): exact("1.00000",14,4)
        with self.assertRaises(ValueError): exact("1.0000",14,3)
        for malformed in ("1e3", " 1.0000", "1.0000 ", "+1.0000", "01.0000"):
            with self.subTest(malformed=malformed), self.assertRaises(ValueError):
                exact(malformed,14,4)

    def test_contextual_payment_precision_usd_vs_ves(self):
        self.assertEqual(Decimal("1.2345"), payment_amount("USD", "1.2345"))
        self.assertEqual(Decimal("1.23"), payment_amount("VES", "1.23"))
        with self.assertRaisesRegex(ValueError, "two decimal"):
            payment_amount("VES", "1.234")
        with self.assertRaisesRegex(ValueError, "unsupported"):
            payment_amount("EUR", "1.00")

    def test_ties_round_away_from_zero(self):
        self.assertEqual(Decimal("1.2345"),rounded(Decimal("1.23445"),4))
        self.assertEqual(Decimal("-1.2345"),rounded(Decimal("-1.23445"),4))
        self.assertEqual(Decimal("1.2344"),rounded(Decimal("1.23444"),4))

    def test_valid_sale_and_historical_snapshot(self):
        sale=reference_sale(); validate_sale(sale)
        current_catalog_price="999.0000"
        self.assertNotEqual(current_catalog_price,sale.lines[0].unit_price_usd)
        validate_sale(sale)

    def test_mutant_line_amount_plus_0001_is_killed(self):
        s=reference_sale(); line=replace(s.lines[0],line_total_usd="29.8126")
        mutant=replace(s,lines=(line,),subtotal_usd="29.8126",total_usd="29.8126",payment_allocations_usd=("29.8126",))
        with self.assertRaisesRegex(InvariantViolation,"line snapshot amount"): validate_sale(mutant)

    def test_mutant_payment_short_by_0001_is_killed(self):
        with self.assertRaisesRegex(InvariantViolation,"payment allocations"):
            validate_sale(replace(reference_sale(),payment_allocations_usd=("29.8124",)))

    def test_mutant_total_changed_without_lines_is_killed(self):
        with self.assertRaisesRegex(InvariantViolation,"lines, subtotal and total"):
            validate_sale(replace(reference_sale(),total_usd="29.8124"))

    def test_ledger_stock_delta_mutant_is_killed(self):
        ms,b=reference_ledger(); validate_ledger(ms,b)
        with self.assertRaisesRegex(InvariantViolation,"ledger does not reconcile"):
            validate_ledger([replace(ms[0],delta="1.501")],b)

    def test_balance_and_reserved_mutants_are_killed(self):
        ms,b=reference_ledger()
        with self.assertRaisesRegex(InvariantViolation,"ledger does not reconcile"): validate_ledger(ms,replace(b,on_hand="1.499"))
        with self.assertRaisesRegex(InvariantViolation,"on-hand/reserved"): validate_ledger(ms,replace(b,reserved="1.501"))

    def test_cross_tenant_and_cross_branch_movement_mutants_are_killed(self):
        ms,b=reference_ledger()
        for mutant in (replace(ms[0],organization="org-b"),replace(ms[0],branch="branch-b")):
            with self.subTest(mutant=mutant),self.assertRaisesRegex(InvariantViolation,"crossed"): validate_ledger([mutant],b)

    def test_actor_scope_mutants_are_killed(self):
        with self.assertRaisesRegex(InvariantViolation,"outside"): validate_actor_scope("org-a",{"branch-a"},"org-b","branch-a")
        with self.assertRaisesRegex(InvariantViolation,"outside"): validate_actor_scope("org-a",{"branch-a"},"org-a","branch-b")
        validate_actor_scope("org-a",{"branch-a"},"org-a","branch-a")

    def test_shift_close_mutant_is_killed(self):
        s=reference_shift(); validate_shift(s)
        with self.assertRaisesRegex(InvariantViolation,"shift cash movements"): validate_shift(replace(s,counted_closing_cash="32.99"))


    def test_integer_and_fractional_quantity_modes(self):
        self.assertEqual(Decimal("1.000"), validate_quantity_mode("integer", "1.000"))
        with self.assertRaisesRegex(InvariantViolation, "must be whole"):
            validate_quantity_mode("integer", "0.500")
        self.assertEqual(Decimal("1.250"), validate_quantity_mode("fractional", "1.250"))
        self.assertEqual(Decimal("0.000"), validate_quantity_mode("integer", "0.000", allow_zero=True))

    def test_sale_quantity_snapshots_match_product_at_insert(self):
        snapshot = QuantitySnapshot("kg", "fractional", "1.250")
        validate_sale_quantity_snapshot(snapshot, "kg", "fractional")
        with self.assertRaisesRegex(InvariantViolation, "does not match product"):
            validate_sale_quantity_snapshot(snapshot, "unidad", "integer")
        # Frozen historical snapshot is independent of later catalog edits.
        current_product = {"unit": "g", "quantity_mode": "fractional"}
        self.assertEqual("kg", snapshot.unit_snapshot)
        self.assertEqual("fractional", snapshot.quantity_mode_snapshot)
        self.assertNotEqual(snapshot.unit_snapshot, current_product["unit"])

    def test_fractional_to_integer_mode_change_checks_minimum_and_balances(self):
        with self.assertRaisesRegex(InvariantViolation, "minimum stock"):
            validate_product_mode_transition("fractional", "integer", "0.500", [])
        with self.assertRaisesRegex(InvariantViolation, "fractional inventory balance"):
            validate_product_mode_transition("fractional", "integer", "0.000", [("1.500", "0.000")])
        validate_product_mode_transition("fractional", "integer", "2.000", [("2.000", "1.000")])

    def test_half_even_mutant_is_killed(self):
        self.assertNotEqual(rounded(Decimal("1.23445"),4),Decimal("1.2344"))

if __name__=="__main__": unittest.main()
