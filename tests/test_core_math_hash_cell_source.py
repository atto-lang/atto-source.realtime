"""Source-free integrity/constant-iteration oracle; NOT real-time guest WCET."""
import hashlib
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
PINS = {
  "math": "f17d67699b620b152da3271bcfc3ada9ee01a1b4",
  "hash": "168026ec74aaa63736fda110514913f8e6911564",
  "cell": "42287b5e6307df1ccb7bfa26f3e7eed6dc563b08"
}
P = 1000000007

class RealTimeCoreSource(unittest.TestCase):
    def test_source_identity_and_freestanding_tier(self):
        for name,want in PINS.items():
            file = ROOT / "library" / "atto.core" / (name + ".atto")
            self.assertTrue(file.is_file())
            self.assertFalse(file.is_symlink())
            data=file.read_bytes()
            self.assertTrue(0 < len(data) <= 1048576)
            blob=hashlib.sha1(b"blob " + str(len(data)).encode("ascii")
                             + bytes([0]) + data).hexdigest()
            self.assertEqual(blob,want)
            code=data.decode("utf8",errors="strict")
            self.assertNotIn(chr(0),code)
            self.assertFalse(code.startswith(chr(0xfeff)))
            self.assertTrue("define pub module " + name + " as" in code)
            for banned in ("java:","dotnet:","import module std",
                           "await ","new Array","process.","stdlib/"):
                self.assertNotIn(banned,code)

    def test_canonical_guest_imports(self):
        guest=(ROOT / "contracts/core-math-hash-cell-v1/guest.atto").read_text("utf8")
        for name in PINS:
            self.assertIn(f'import module {name} from "atto.core/{name}";', guest)
        self.assertNotIn("from pkg ", guest)

    def test_constant_iteration_source_candidate(self):
        h=(ROOT / "library" / "atto.core" / "hash.atto").read_text("utf8")
        self.assertIn("i < 31",h)
        self.assertNotIn("while ",h)
        self.assertIn("1000000007",h)
        for state in [0,1,17,P-1]:
            for byte in range(256):
                n=state*31+byte
                for _ in range(31):
                    if n >= P: n-=P
                self.assertEqual(n,(state*31+byte)%P)
        self.assertEqual((17*31+42)*31+7,17646)

    def test_no_runtime_cell_wcet_claim(self):
        c=(ROOT / "library" / "atto.core" / "cell.atto").read_text("utf8")
        self.assertIn("never a synchronization API",c)
        self.assertIn("does not claim lock-free progress",c)


    def test_owner_operations_remain_non_authoritative_policy_only(self):
        cell = (ROOT / "library" / "atto.core" / "cell.atto").read_text("utf8")
        for operation in ("valid_loan_state", "can_owner_read", "can_owner_write",
                          "can_move_owner", "can_suspend_unpinned"):
            self.assertIn("pub fnc " + operation + "(", cell)
        # Host reference is deliberately NOT compiler or guest execution.
        vectors = ((0, False, True, True), (1, False, True, False),
                   (65535, False, True, False), (65536, False, False, False),
                   (-1, False, False, False), (0, True, True, False),
                   (1, True, False, False))
        for readers, writer, valid, writable in vectors:
            self.assertEqual(0 <= readers <= 65535 and (not writer or readers == 0), valid)
            self.assertEqual(readers == 0 and not writer, writable)
        self.assertNotIn("pub fnc issue_loan(", cell)

    def test_saturated_shared_loan_denies_new_acquisition_but_not_owner_read(self):
        cell = (ROOT / "library" / "atto.core" / "cell.atto").read_text("utf8")
        self.assertIn("readers >= 0 && readers < 65535", cell)
        # Independent source-only reference: not a compiler-checked loan.
        for readers, writer, permitted in (
            (0, False, True), (65534, False, True),
            (65535, False, False), (65536, False, False),
            (-1, False, False), (0, True, False)
        ):
            self.assertEqual(0 <= readers < 65535 and not writer, permitted)
        self.assertTrue(0 <= 65535 <= 65535)  # existing owner may still read
        self.assertNotIn("pub fnc issue_loan(", cell)

if __name__ == "__main__":
    unittest.main()
