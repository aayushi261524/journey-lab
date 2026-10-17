import { useCallback, useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, type Node, type Edge, type OnConnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type Step = Node<{ label: string; kind: string; note: string }>;
type Journey = { nodes: Step[]; edges: Edge[] };
const KEY = 'aayushi-journey-lab-v1';
const makeNode = (id: string, label: string, x: number, y: number, kind = 'action', note = ''): Step => ({ id, position: { x, y }, data: { label, kind, note }, type: kind === 'start' ? 'input' : kind === 'outcome' ? 'output' : 'default', style: { borderRadius: 14, padding: 16, width: 185, border: '1px solid #85978f', background: kind === 'decision' ? '#fff0d2' : kind === 'recovery' ? '#fce4e1' : '#fff', color: '#193b34', fontSize: 14 } });
const templates: Record<string, Journey> = {
  onboarding: { nodes: [makeNode('a', 'Discover the service', 0, 80, 'start'), makeNode('b', 'Confirm the user goal', 260, 80), makeNode('c', 'Enough information?', 520, 80, 'decision', 'What is the smallest set of inputs needed to proceed?'), makeNode('d', 'Clarify missing context', 520, 280, 'recovery'), makeNode('e', 'Reach the first useful result', 820, 80, 'outcome')], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'cd', source: 'c', target: 'd', label: 'Needs context' }, { id: 'ce', source: 'c', target: 'e', label: 'Ready' }, { id: 'de', source: 'd', target: 'e' }] },
  checkout: { nodes: [makeNode('a', 'Review the order', 0, 80, 'start'), makeNode('b', 'Choose payment method', 260, 80), makeNode('c', 'Payment completed?', 520, 80, 'decision'), makeNode('d', 'Explain failure and retry', 520, 280, 'recovery', 'Preserve the basket and avoid duplicate charges.'), makeNode('e', 'Confirm order and next steps', 820, 80, 'outcome')], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'cd', source: 'c', target: 'd', label: 'Failed' }, { id: 'ce', source: 'c', target: 'e', label: 'Success' }, { id: 'db', source: 'd', target: 'b', label: 'Retry' }] },
};
function initial(): Journey {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const value = JSON.parse(raw) as Journey;
      const ids = new Set(value.nodes?.map((n) => n.id));
      if (value.nodes?.length && value.nodes.length <= 100 && value.nodes.every((n) => typeof n.id === 'string' && typeof n.data?.label === 'string' && Number.isFinite(n.position?.x) && Number.isFinite(n.position?.y)) && Array.isArray(value.edges) && value.edges.every((e) => ids.has(e.source) && ids.has(e.target))) return value;
    }
  } catch { /* Start from a usable template if saved data is unavailable. */ }
  return structuredClone(templates.onboarding);
}

export default function App() {
  const [seed] = useState(initial);
  const [nodes, setNodes, onNodesChange] = useNodesState<Step>(seed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(seed.edges);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('Choose a template, then make the journey your own.');
  const [findings, setFindings] = useState<string[]>([]);
  const active = nodes.find((node) => node.id === selected);
  const onConnect: OnConnect = useCallback((connection) => setEdges((current) => addEdge(connection, current)), [setEdges]);
  useEffect(() => { document.title = 'Journey Lab — Product journey sandbox'; }, []);
  useEffect(() => { setFindings([]); }, [nodes, edges]);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ nodes, edges })); setNotice('Saved in this browser. Save again after your next edits.'); }
    catch { setNotice('This browser could not save. Export JSON to keep a copy.'); }
  }
  function loadTemplate(name: string) {
    if (!window.confirm('Replace the current canvas? Export or save first if you want to keep it.')) return;
    const value = structuredClone(templates[name]);
    setNodes(value.nodes); setEdges(value.edges); setSelected(''); setNotice('Template loaded. Changes are not saved until you choose Save.');
  }
  function addStep() {
    const node = makeNode(crypto.randomUUID(), 'New step', 200 + nodes.length * 25, 360);
    setNodes((current) => [...current, node]); setSelected(node.id); setNotice('Step added. Edit its label and connect the handles.');
  }
  function edit(field: 'label' | 'note', value: string) {
    setNodes((current) => current.map((node) => node.id === selected ? { ...node, data: { ...node.data, [field]: value } } : node));
  }
  function remove() {
    setNodes((current) => current.filter((node) => node.id !== selected));
    setEdges((current) => current.filter((edge) => edge.source !== selected && edge.target !== selected));
    setSelected(''); setNotice('Step and its connected paths removed from the current canvas.');
  }
  function audit() {
    const result: string[] = [];
    const starts = nodes.filter((n) => n.type === 'input');
    const outcomes = nodes.filter((n) => n.type === 'output');
    if (!starts.length) result.push('Add a start: the journey needs a clear entry point.');
    if (!outcomes.length) result.push('Add an outcome: what useful result should the person reach?');
    const visited = new Set<string>();
    const queue = starts.map((n) => n.id);
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id); edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target));
    }
    const unreachable = nodes.filter((n) => !visited.has(n.id));
    if (unreachable.length) result.push(`${unreachable.length} step(s) cannot be reached from a start.`);
    const deadEnds = nodes.filter((n) => n.type !== 'output' && !edges.some((e) => e.source === n.id));
    if (deadEnds.length) result.push(`${deadEnds.length} non-outcome step(s) have no next path.`);
    const decisions = nodes.filter((n) => n.data.kind === 'decision' && edges.filter((e) => e.source === n.id).length < 2);
    if (decisions.length) result.push(`${decisions.length} decision(s) have fewer than two paths. Consider the alternative.`);
    if (outcomes.length && !outcomes.some((n) => visited.has(n.id))) result.push('No outcome is reachable from the current start.');
    setFindings(result.length ? result : ['Basic structure looks connected. Next, review clarity and test the journey with people.']);
    setNotice('Structural review complete. This checks paths, not usability or production readiness.');
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ version: 1, name: 'Journey Lab canvas', nodes, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'journey-lab.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('JSON exported. Keep it as a record of this version.');
  }
  return <div className="lab-shell">
    <style>{`
      *{box-sizing:border-box}body{background:#f3f5f1;color:#193b34;font-family:Arial,sans-serif}button,input,textarea{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #d48742;outline-offset:3px}.lab-shell{height:100%;display:flex;flex-direction:column}.lab-head{padding:22px 30px;border-bottom:1px solid #d5ded4;display:flex;justify-content:space-between;align-items:center;gap:20px;background:#fff}.lab-head h1{font-family:Georgia,serif;font-size:32px;margin:0;font-weight:400;letter-spacing:-1px}.lab-head p{margin:5px 0 0;font-size:14px;color:#5b7068}.lab-actions{display:flex;gap:8px;flex-wrap:wrap}.lab-button{border:1px solid #b7c5bc;padding:10px 14px;border-radius:9px;background:white;color:#193b34;font-size:14px}.lab-button.primary{background:#245c4d;border-color:#245c4d;color:white}.lab-body{display:grid;grid-template-columns:275px 1fr;flex:1;min-height:0}.lab-sidebar{padding:24px 22px;background:#f9faf7;border-right:1px solid #d5ded4;overflow:auto}.lab-label{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#526e62;font-weight:700}.lab-sidebar h2{font-family:Georgia,serif;font-size:25px;font-weight:400;line-height:1.2;margin:12px 0}.lab-sidebar p{font-size:14px;color:#526e62;line-height:1.6}.lab-templates{display:grid;gap:8px;margin:18px 0}.lab-templates button{text-align:left}.lab-field{display:grid;gap:7px;margin:15px 0;font-size:14px}.lab-field input,.lab-field textarea{width:100%;border:1px solid #b7c5bc;border-radius:8px;padding:10px;background:#fff;color:#193b34}.lab-field textarea{min-height:85px;resize:vertical}.lab-foot{padding-top:22px;margin-top:25px;border-top:1px solid #d5ded4;font-size:12px;line-height:1.7;color:#526e62}.lab-foot a{color:#245c4d}.lab-canvas{min-height:360px;height:100%;position:relative}.lab-status{padding:11px 25px;border-top:1px solid #d5ded4;background:#fff;font-size:13px;line-height:1.5}.lab-findings{padding:14px;border:1px solid #cfb782;background:#fff6df;border-radius:10px;margin-top:18px}.lab-findings p{color:#594727;margin:5px 0 12px}.react-flow__node.selected{outline:3px solid #d48742}.lab-hint{position:absolute;bottom:18px;left:65px;background:#ffffffed;border:1px solid #d5ded4;border-radius:8px;padding:8px 13px;z-index:4;font-size:12px;pointer-events:none}@media(max-width:760px){.lab-head{padding:18px;display:block}.lab-actions{margin-top:15px}.lab-body{display:flex;flex-direction:column;overflow:auto}.lab-sidebar{border-right:0;overflow:visible;padding:18px}.lab-canvas{height:550px;min-height:550px;flex-shrink:0}.lab-templates{grid-template-columns:1fr 1fr}.lab-foot{margin-top:18px}.lab-hint{display:none}.react-flow__minimap{display:none}.lab-status{padding:10px 18px}}
    `}</style>
    <header className="lab-head"><div><h1>Journey Lab<span style={{ color: '#b76e30' }}>.</span></h1><p>Make the next step visible.</p></div><div className="lab-actions"><button className="lab-button" onClick={addStep}>+ Add step</button><button className="lab-button" onClick={exportJSON}>Export JSON</button><button className="lab-button" onClick={save}>Save locally</button><button className="lab-button primary" onClick={audit}>Check journey</button></div></header>
    <div className="lab-body"><aside className="lab-sidebar"><span className="lab-label">Product journey sandbox</span><h2>From a user goal<br />to a useful outcome.</h2><p>Arrange the steps. Connect alternatives. Make room for recovery.</p><div className="lab-templates"><button className="lab-button" onClick={() => loadTemplate('onboarding')}>Onboarding template</button><button className="lab-button" onClick={() => loadTemplate('checkout')}>Checkout + recovery</button></div><p><strong>{nodes.length}</strong> steps · <strong>{edges.length}</strong> paths</p>{active ? <section aria-label="Edit selected step"><h2>Edit this step</h2><label className="lab-field">Step label<input maxLength={90} value={active.data.label} onChange={(e) => edit('label', e.target.value)} /></label><label className="lab-field">Decision or context notes<textarea maxLength={800} value={active.data.note} onChange={(e) => edit('note', e.target.value)} /></label><button className="lab-button" onClick={remove}>Remove selected step</button></section> : <p>Select a step to edit its label and context notes. Drag between handles to connect steps. Select a path and press Backspace to remove it.</p>}{findings.length > 0 && <section className="lab-findings" aria-label="Journey review"><strong>Structural review</strong>{findings.map((finding) => <p key={finding}>{finding}</p>)}</section>}<div className="lab-foot">Open-source adaptation for Aayushi’s portfolio. Canvas foundation: <a href="https://github.com/xyflow/vite-react-flow-template" target="_blank" rel="noreferrer">xyflow’s MIT-licensed starter</a>. Added product templates, step editing, local saving, export, and structural review. No workflow execution, AI model, or collaboration service.</div></aside><main className="lab-canvas" aria-label="Journey canvas"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelected(node.id)} onPaneClick={() => setSelected('')} fitView minZoom={0.2} maxZoom={1.7}><Background color="#c0cec4" gap={22} /><MiniMap /><Controls /></ReactFlow><div className="lab-hint">Drag to arrange · connect handles to add a path · select a step to edit</div></main></div><div className="lab-status" role="status" aria-live="polite">{notice}</div>
  </div>;
}
