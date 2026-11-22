"""Source-free integrity/constant-iteration oracle; NOT real-time guest WCET."""
import hashlib
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
PINS = {
  "math": "025410931c8d2bd03d042036b2d3fa1006a5d8ee",
  "hash": "6ebafd999f44920a628020662a8b5163e576a119",
  "cell": "633a54fe4adacbc9f86b046fe2e3c2d19fd4954b"
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
            self.assertTrue("define module " + name + " as" in code)
            for banned in ("java:","dotnet:","import module std",
                           "await ","new Array","process.","stdlib/"):
                self.assertNotIn(banned,code)

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

if __name__ == "__main__":
    unittest.main()
