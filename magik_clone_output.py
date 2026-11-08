"""Dynamic reference fan-out; no tensor copies or model imports."""

class AnyType(str):
    def __ne__(self, other):
        return False


ANY = AnyType("*")


class RepeatingTuple(tuple):
    """Advertise one initial socket, allow arbitrary dynamic socket indices."""

    def __getitem__(self, index):
        if isinstance(index, int) and index >= 0:
            return super().__getitem__(0)
        return super().__getitem__(index)


class MagikCloneOutput:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {"value": (ANY, {"forceInput": True})},
            "hidden": {"prompt": "PROMPT", "unique_id": "UNIQUE_ID"},
        }

    RETURN_TYPES = RepeatingTuple((ANY,))
    RETURN_NAMES = RepeatingTuple(("Copy 1",))
    FUNCTION = "clone"
    CATEGORY = "Magik/utils"
    DESCRIPTION = "Returns the original value through every connected output. Adds a spare output automatically."

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        return True

    @staticmethod
    def output_count(prompt, unique_id):
        graph = prompt
        node_id = str(unique_id)
        count = 1
        for node in graph.values():
            for link in node.get("inputs", {}).values():
                if (isinstance(link, list) and len(link) == 2
                        and str(link[0]) == node_id
                        and isinstance(link[1], int) and not isinstance(link[1], bool)
                        and link[1] >= 0):
                    count = max(count, link[1] + 1)
        return count

    @classmethod
    def IS_CHANGED(cls, value, prompt, unique_id):
        # Hidden PROMPT is not a normal cache dependency. Adding a branch must
        # invalidate a cached result that previously had fewer output slots.
        return cls.output_count(prompt, unique_id)

    def clone(self, value, prompt, unique_id):
        count = self.output_count(prompt, unique_id)
        # Normal ComfyUI execution maps over execution lists and merges each
        # returned slot. No custom list flags or unbounded metadata iterators.
        return tuple(value for _ in range(count))


NODE_CLASS_MAPPINGS = {"MagikCloneOutput": MagikCloneOutput}
NODE_DISPLAY_NAME_MAPPINGS = {"MagikCloneOutput": "Magik Clone Output"}
