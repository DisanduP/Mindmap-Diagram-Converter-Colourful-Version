# Mermaid Mindmap to Draw.io XML Converter

This tool converts any Mermaid mindmap diagram into Draw.io XML format that can be imported into Draw.io for editing.

## Features

- Parses Mermaid mindmap syntax
- Supports all Mermaid mindmap shapes (circle, square, rounded, hexagon, cloud, bang)
- Generates radial layout Draw.io XML
- Command-line interface with file input/output and stdin support

## Usage

### Convert a file
```bash
node converter.js input.mmd [output.drawio.xml]
```

### Pipe from stdin
```bash
cat mindmap.mmd | node converter.js
# or
echo "mindmap
  root
    child1
    child2" | node converter.js
```

## Mermaid Mindmap Syntax

The converter supports standard Mermaid mindmap syntax:

```
mindmap
  root((central idea))
    Branch 1
      Sub 1.1
      Sub 1.2
    Branch 2
      Sub 2.1
```

### Shapes

- `((text))` - Circle
- `[text]` - Square
- `(text)` - Rounded rectangle
- `{{text}}` - Hexagon
- `)text(` - Cloud
- `))text((` - Bang
- Default - Rounded rectangle

## Output

The output is a Draw.io XML file that can be imported via File → Import From → Text in Draw.io.

The layout uses a radial positioning with:
- Root at center
- Level 1 branches at 350px radius
- Level 2 at 280px radius
- Deeper levels at 220px radius

## Requirements

- Node.js

## Installation

No installation required, just run with Node.js.

## Example

Input `sample.mmd`:
```
mindmap
  root((mindmap))
    Origins
      Long history
    Research
      On effectiveness<br/>and features
```

Output: `sample.drawio.xml` (Draw.io XML format)
