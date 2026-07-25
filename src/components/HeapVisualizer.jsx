import { useMemo } from 'react';
import { X, GitBranch } from 'lucide-react';

/**
 * HeapVisualizer
 * SVG-based binary tree rendering of the Max-Heap array.
 * Each node shows influencer name + score.
 */
export default function HeapVisualizer({ heapArray = [], onClose }) {
  const nodeRadius = 28;
  const levelGap = 80;
  const minNodeGap = 20;

  // Calculate tree layout
  const layout = useMemo(() => {
    if (heapArray.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

    const depth = Math.floor(Math.log2(heapArray.length)) + 1;
    const maxLeaves = Math.pow(2, depth - 1);
    const treeWidth = Math.max(400, maxLeaves * (nodeRadius * 2 + minNodeGap));
    const treeHeight = depth * levelGap + 60;

    const nodes = [];
    const edges = [];

    for (let i = 0; i < heapArray.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, level) - 1);
      const nodesInLevel = Math.pow(2, level);
      const levelWidth = treeWidth / nodesInLevel;
      const x = levelWidth * posInLevel + levelWidth / 2;
      const y = level * levelGap + 50;

      nodes.push({ index: i, x, y, data: heapArray[i] });

      // Edge to parent
      if (i > 0) {
        const parentIdx = Math.floor((i - 1) / 2);
        const parentLevel = Math.floor(Math.log2(parentIdx + 1));
        const parentPosInLevel = parentIdx - (Math.pow(2, parentLevel) - 1);
        const parentNodesInLevel = Math.pow(2, parentLevel);
        const parentLevelWidth = treeWidth / parentNodesInLevel;
        const px = parentLevelWidth * parentPosInLevel + parentLevelWidth / 2;
        const py = parentLevel * levelGap + 50;
        edges.push({ x1: px, y1: py + nodeRadius, x2: x, y2: y - nodeRadius });
      }
    }

    return { nodes, edges, width: treeWidth, height: treeHeight };
  }, [heapArray]);

  // Score to color intensity
  const scoreToColor = (score) => {
    const intensity = Math.min(1, Math.max(0, (score || 0) / 100));
    const r = Math.round(124 + (255 - 124) * (1 - intensity));
    const g = Math.round(58 + (255 - 58) * (1 - intensity));
    const b = Math.round(237 + (255 - 237) * (1 - intensity));
    return `rgb(${r}, ${g}, ${b})`;
  };

  if (heapArray.length === 0) {
    return (
      <div className="heap-viz-overlay" onClick={onClose}>
        <div className="heap-viz-modal" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-[#111111] text-[1rem] font-bold">
              <GitBranch size={18} style={{ color: '#7c3aed' }} /> Max-Heap Tree
            </h3>
            <button onClick={onClose} className="heap-viz-close"><X size={16} /></button>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-[#999999] text-[0.85rem]">
            <GitBranch size={40} className="mb-3" style={{ color: '#e5e7eb' }} />
            No influencers in the heap yet
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="heap-viz-overlay" onClick={onClose}>
      <div className="heap-viz-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-[#111111] text-[1rem] font-bold">
            <GitBranch size={18} style={{ color: '#7c3aed' }} /> Max-Heap Tree
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[0.72rem] text-[#999999]">{heapArray.length} node{heapArray.length !== 1 ? 's' : ''}</span>
            <button onClick={onClose} className="heap-viz-close"><X size={16} /></button>
          </div>
        </div>

        {/* Heap explanation */}
        <div className="flex items-start gap-2 p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] mb-4 text-[0.75rem] text-[#555555]">
          <GitBranch size={14} className="shrink-0 mt-[2px]" style={{ color: '#7c3aed' }} />
          <span>
            <strong>Max-Heap:</strong> Parent nodes always have a higher score than their children.
            The root (top) is always the highest-scored influencer. Insert and extract operations maintain this property in O(log n) time.
          </span>
        </div>

        {/* SVG Tree */}
        <div className="overflow-auto" style={{ maxHeight: '55vh' }}>
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="heap-viz-svg"
          >
            {/* Edges */}
            {layout.edges.map((edge, i) => (
              <line
                key={`e-${i}`}
                x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
                stroke="#d1d5db"
                strokeWidth="1.5"
              />
            ))}

            {/* Nodes */}
            {layout.nodes.map(node => (
              <g key={node.index}>
                <circle
                  cx={node.x} cy={node.y} r={nodeRadius}
                  fill={scoreToColor(node.data.score)}
                  stroke={node.index === 0 ? '#7c3aed' : '#e5e7eb'}
                  strokeWidth={node.index === 0 ? 2.5 : 1.5}
                />
                <text
                  x={node.x} y={node.y - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={node.data.score > 60 ? '#ffffff' : '#111111'}
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="Outfit, sans-serif"
                >
                  {node.data.score}
                </text>
                <text
                  x={node.x} y={node.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={node.data.score > 60 ? 'rgba(255,255,255,0.8)' : '#555555'}
                  fontSize="7"
                  fontWeight="600"
                  fontFamily="Outfit, sans-serif"
                >
                  {node.data.name?.length > 10 ? node.data.name.slice(0, 9) + '…' : node.data.name}
                </text>
                {/* Index label */}
                <text
                  x={node.x + nodeRadius + 4} y={node.y}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fill="#999999"
                  fontSize="8"
                  fontFamily="Outfit, sans-serif"
                >
                  [{node.index}]
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Array representation */}
        <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
          <span className="text-[0.72rem] font-semibold text-[#999999] uppercase tracking-[0.06em] block mb-2">
            Heap Array Representation
          </span>
          <div className="flex flex-wrap gap-1">
            {heapArray.map((item, i) => (
              <div
                key={i}
                className="inline-flex flex-col items-center px-2 py-1 rounded-[6px] border text-[0.68rem]"
                style={{
                  background: i === 0 ? 'rgba(124,58,237,0.08)' : '#f9fafb',
                  borderColor: i === 0 ? '#7c3aed' : '#e5e7eb',
                  color: i === 0 ? '#7c3aed' : '#555555',
                }}
              >
                <span className="font-bold">{item.score}</span>
                <span className="text-[0.6rem] text-[#999999]">[{i}]</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
