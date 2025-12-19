#!/usr/bin/env node

/**
 * Mermaid Mindmap to Draw.io XML Converter
 * Converts any Mermaid mindmap diagram to Draw.io XML format
 */

const fs = require('fs');
const path = require('path');

// Main conversion function
function convertMermaidToDrawio(mermaidCode) {
    // Parse the Mermaid mindmap
    const tree = parseMermaidMindmap(mermaidCode);

    // Generate Draw.io XML
    const xml = generateDrawioXML(tree);

    return xml;
}

// Parse Mermaid mindmap into tree structure
function parseMermaidMindmap(code) {
    const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('mindmap'));

    if (lines.length === 0) return null;

    const indentLevels = new Map();
    let nodeId = 0;

    function parseLine(line, parent = null) {
        const indent = getIndentationLevel(line);
        const { text, shape } = parseNodeText(line.trim());
        const level = indentLevels.get(indent) || (indentLevels.size);

        if (!indentLevels.has(indent)) {
            indentLevels.set(indent, indentLevels.size);
        }

        const node = {
            id: `node${nodeId++}`,
            text,
            children: [],
            level: indentLevels.get(indent),
            shape
        };

        if (parent) {
            parent.children.push(node);
        }

        return node;
    }

    const root = parseLine(lines[0]);
    const stack = [{ node: root, indent: getIndentationLevel(lines[0]) }];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const indent = getIndentationLevel(line);

        // Find the correct parent
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        const parent = stack.length > 0 ? stack[stack.length - 1].node : null;
        const node = parseLine(line, parent);
        stack.push({ node, indent });
    }

    return root;
}

// Get indentation level based on spaces/tabs
function getIndentationLevel(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
}

// Parse node text and shape
function parseNodeText(line) {
    let text = line;
    let shape = 'default';

    // Match circle: ((text))
    const circleMatch = line.match(/(.+)?\(\((.+)\)\)(.*)?/);
    if (circleMatch) {
        text = circleMatch[2];
        shape = 'circle';
        return { text, shape };
    }

    // Match square: [text]
    const squareMatch = line.match(/(.+)?\[(.+)\](.*)?/);
    if (squareMatch) {
        text = squareMatch[2];
        shape = 'square';
        return { text, shape };
    }

    // Match rounded: (text)
    const roundedMatch = line.match(/(.+)?\((.+)\)(.*)?/);
    if (roundedMatch && !roundedMatch[1] && !roundedMatch[3]) { // only if no extra
        text = roundedMatch[2];
        shape = 'rounded';
        return { text, shape };
    }

    // Match hexagon: {{text}}
    const hexMatch = line.match(/(.+)?\{\{(.+)\}\}(.*)?/);
    if (hexMatch) {
        text = hexMatch[2];
        shape = 'hexagon';
        return { text, shape };
    }

    // Match cloud: )text(
    const cloudMatch = line.match(/(.+)?\)(.+)\((.*)?/);
    if (cloudMatch) {
        text = cloudMatch[2];
        shape = 'cloud';
        return { text, shape };
    }

    // Match bang: ))text((
    const bangMatch = line.match(/(.+)?\)\)(.+)\(\((.*)?/);
    if (bangMatch) {
        text = bangMatch[2];
        shape = 'bang';
        return { text, shape };
    }

    // Default
    return { text: line, shape: 'default' };
}

// Generate Draw.io XML
function generateDrawioXML(tree) {
    // Canvas size
    const canvasWidth = 2400;
    const canvasHeight = 1800;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Assign positions and sizes
    assignPositions(tree, centerX, centerY);

    // Collect nodes and connections
    const nodes = [];
    const connections = [];
    collectNodesAndConnections(tree, nodes, connections);

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Mermaid-Mindmap-Converter" version="21.0.0">
  <diagram name="Mindmap" id="diagram_${Date.now()}">
    <mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${canvasWidth}" pageHeight="${canvasHeight}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${nodes.map(node => `        <mxCell id="${node.id}" value="${escapeXml(node.text)}" style="${getNodeStyle(node.shape, node.level)}" vertex="1" parent="1">
          <mxGeometry x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" as="geometry"/>
        </mxCell>`).join('\n')}
${connections.map((conn, index) => {
    const sourceNode = nodes.find(n => n.id === conn.source);
    const targetNode = nodes.find(n => n.id === conn.target);
    
    // Determine if child is to the left or right of parent
    const isLeft = targetNode.x < sourceNode.x;
    
    // If target is left: Exit parent at 0 (left), Enter child at 1 (right)
    // If target is right: Exit parent at 1 (right), Enter child at 0 (left)
    const exitX = isLeft ? 0 : 1;
    const entryX = isLeft ? 1 : 0;

    const style = `edgeStyle=entityRelationEdgeStyle;curved=1;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeWidth=2;exitX=${exitX};exitY=0.5;entryX=${entryX};entryY=0.5;`;
    
    return `        <mxCell id="conn${index + 2}" style="${style}" edge="1" parent="1" source="${conn.source}" target="${conn.target}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`;
}).join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    return xml;
}

// Assign positions to nodes in a horizontal tree structure
function assignPositions(node, cx, cy, direction = 1) {
    node.width = getWidthForLevel(node.level);
    node.height = getHeightForLevel(node.level);
    node.x = cx - node.width / 2;
    node.y = cy - node.height / 2;

    const children = node.children;
    if (children.length === 0) return;

    // Calculate spacing between children
    const levelSpacing = 300; // horizontal distance between levels
    const siblingSpacing = 120; // vertical spacing between siblings

    // Calculate total height needed for children
    const totalHeight = (children.length - 1) * siblingSpacing;
    let startY = cy - totalHeight / 2;

    children.forEach((child, index) => {
        // --- BALANCED LOGIC ---
        // If this is the root node (level 0), split children left and right
        let currentDir = direction;
        if (node.level === 0) {
            currentDir = (index < children.length / 2) ? 1 : -1;
        }
        
        const childX = cx + (currentDir * levelSpacing);
        const childY = startY + (index * siblingSpacing);
        
        // Pass the direction down to all descendants
        assignPositions(child, childX, childY, currentDir);
    });
}

// Collect nodes and connections
function collectNodesAndConnections(node, nodes, connections) {
    nodes.push(node);

    node.children.forEach(child => {
        connections.push({ source: node.id, target: child.id });
        collectNodesAndConnections(child, nodes, connections);
    });
}

// Get radius for level
function getRadiusForLevel(level) {
    switch (level) {
        case 0: return 0;
        case 1: return 200;
        case 2: return 150;
        default: return 120;
    }
}

// Get width for level
function getWidthForLevel(level) {
    switch (level) {
        case 0: return 200;
        case 1: return 250;
        case 2: return 220;
        default: return 180;
    }
}

// Get height for level
function getHeightForLevel(level) {
    switch (level) {
        case 0: return 90;
        case 1: return 70;
        case 2: return 55;
        default: return 45;
    }
}

// Get node style
function getNodeStyle(shape, level) {
    let baseStyle = "rounded=1;whiteSpace=wrap;html=1;overflow=hidden;";
    const fontSize = level === 0 ? 14 : level === 1 ? 12 : 11;

    baseStyle += `fontSize=${fontSize};`;

    switch (shape) {
        case 'circle':
            baseStyle += "fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;";
            break;
        default:
            if (level === 0) {
                baseStyle += "fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;";
            } else if (level === 1) {
                baseStyle += "fillColor=#fff2cc;strokeColor=#d6b656;";
            } else {
                baseStyle += "fillColor=#f8cecc;strokeColor=#b85450;";
            }
            break;
    }

    return baseStyle;
}

// Escape XML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&#39;';
            case '"': return '&quot;';
        }
    });
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Read from stdin
        let mermaidCode = '';
        process.stdin.on('data', chunk => {
            mermaidCode += chunk;
        });
        process.stdin.on('end', () => {
            const xml = convertMermaidToDrawio(mermaidCode);
            console.log(xml);
        });
    } else {
        const inputFile = args[0];
        const outputFile = args[1] || inputFile.replace('.mmd', '.drawio.xml').replace('.txt', '.drawio.xml');

        try {
            const mermaidCode = fs.readFileSync(inputFile, 'utf8');
            const xml = convertMermaidToDrawio(mermaidCode);
            fs.writeFileSync(outputFile, xml);
            console.log(`Converted ${inputFile} to ${outputFile}`);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }
}

module.exports = { convertMermaidToDrawio };
