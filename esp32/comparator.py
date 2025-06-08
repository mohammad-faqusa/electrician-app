# -------------------------------------------------
#  Generic MethodWrapper (unchanged)
# -------------------------------------------------
class MethodWrapper:
    """Allow func[a, b] or func[(a, b)] style calls."""
    def __init__(self, func):
        self._func = func

    def __getitem__(self, args):
        # Accept either a tuple/list or a single arg
        if isinstance(args, (list, tuple)):
            return self._func(*args)
        return self._func(args)


# -------------------------------------------------
#  Comparator: stateless, two-argument tests
# -------------------------------------------------
class Comparator:
    
    def __init__(self):
        # Wrap each test so it supports [value, threshold] syntax
        self.gt = MethodWrapper(self._greaterthan)
        self.lt = MethodWrapper(self._lessthan)
        self.eq = MethodWrapper(self._equalto)

    # ---- internal comparison helpers ----
    def _greaterthan(self, value, threshold):
        return value > threshold

    def _lessthan(self, value, threshold):
        return value < threshold

    def _equalto(self, value, threshold):
        return value == threshold

    # Enable cmp['greaterthan'] lookup
    def __getitem__(self, name):
        return getattr(self, name)



