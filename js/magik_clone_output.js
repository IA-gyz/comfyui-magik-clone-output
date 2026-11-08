import { app } from "../../../scripts/app.js";

const NODE = "MagikCloneOutput";
const pending = new WeakSet();

function synchronize(node) {
    if (!node.graph || app.configuringGraph) return;
    let lastConnected = -1;
    for (let i = 0; i < (node.outputs?.length ?? 0); i++) {
        if (node.outputs[i].links?.length) lastConnected = i;
    }
    const wanted = lastConnected + 2; // connected sockets plus exactly one spare
    while ((node.outputs?.length ?? 0) < wanted) {
        node.addOutput(`Copy ${node.outputs.length + 1}`, "*");
    }
    while (node.outputs.length > wanted) node.removeOutput(node.outputs.length - 1);

    const inputLink = node.graph.links[node.inputs?.[0]?.link];
    const source = inputLink && node.graph.getNodeById(inputLink.origin_id);
    const type = source?.outputs?.[inputLink.origin_slot]?.type ?? "*";
    for (let i = 0; i < node.outputs.length; i++) {
        node.outputs[i].name = `Copy ${i + 1}`;
        node.outputs[i].type = type;
        // Keep link metadata aligned with the source without replacing links.
        for (const id of node.outputs[i].links ?? []) {
            const link = node.graph.links[id];
            if (link) link.type = type;
        }
    }
    const minimum = node.computeSize();
    node.setSize([Math.max(node.size[0], minimum[0]), minimum[1]]);
    node.setDirtyCanvas(true, true);
}

function schedule(node) {
    if (pending.has(node)) return;
    pending.add(node);
    queueMicrotask(() => {
        pending.delete(node);
        synchronize(node);
    });
}

app.registerExtension({
    name: "Magik.CloneOutput",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE) return;
        for (const hook of ["onNodeCreated", "onAdded", "onConfigure", "onConnectionsChange"]) {
            const previous = nodeType.prototype[hook];
            nodeType.prototype[hook] = function (...args) {
                const result = previous?.apply(this, args);
                schedule(this);
                return result;
            };
        }
    },
    afterConfigureGraph() {
        for (const node of app.graph._nodes ?? []) {
            if (node.comfyClass === NODE || node.type === NODE) schedule(node);
        }
    },
});
