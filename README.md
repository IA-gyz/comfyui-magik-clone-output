# Magik Clone Output

Pass any connected ComfyUI value to as many branches as needed.

## Install

Extract this folder into `ComfyUI/custom_nodes/`, producing:

```
ComfyUI/custom_nodes/magik_clone_output/__init__.py
ComfyUI/custom_nodes/magik_clone_output/magik_clone_output.py
ComfyUI/custom_nodes/magik_clone_output/js/magik_clone_output.js
```

Restart ComfyUI and refresh the browser. Find **Magik Clone Output** under
**Magik → utils**. No additional dependencies are needed.

## Use

Connect any source to **value**, then connect **Copy 1** to a destination.
Another output appears automatically. Continue connecting branches as needed.
Each output can also connect to multiple destinations.

Disconnecting branches removes excess trailing empty sockets, leaving one spare.
Empty sockets between connected sockets stay in place. Existing socket indices
and links are preserved. The workflow stores its sockets normally and restores
them on reload. Output types follow the directly connected source; an unresolved
wildcard source remains a wildcard.

## Semantics

This is reference fan-out, not a deep copy. Tensors, models, dictionaries and
other objects are passed unchanged. A downstream node that mutates an object
in place can affect the other branches. Normal image batches, execution lists,
are preserved using standard ComfyUI list mapping. Empty execution lists follow
ComfyUI's normal behavior for nodes without INPUT_IS_LIST.

The node has no output-count widget and no fixed output limit. It runs only
when a connected downstream output node needs it.

## Implementation notes for maintainers

The Python backend uses the classic custom-node API, a wildcard input and a
tuple subclass that supplies output metadata for dynamic indices. It computes
the required execution output count from references to this node in the API
prompt, so sparse connected outputs work without a hidden count widget.
Execution uses normal ComfyUI list mapping and default output merging; there
are no INPUT_IS_LIST or OUTPUT_IS_LIST overrides. All exported metadata has
finite iteration. `IS_CHANGED` includes the required output count so adding
higher output sockets invalidates shorter cached results.

The frontend uses standard LiteGraph lifecycle hooks and deferred updates.
During workflow configuration it defers pruning until `afterConfigureGraph`.
Only trailing unconnected sockets are removed. No core ComfyUI code is modified.

Verification: standalone backend identity/list tests and mocked frontend
connection/configuration tests. A live ComfyUI session was not available for
end-to-end testing. Frontend changes in future ComfyUI releases may require
adapting its LiteGraph hooks.
