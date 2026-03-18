const fs = require('fs');
const file = 'Header.tsx';

if (fs.existsSync(file) === false) {
  console.error(file + ' not found.');
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

const regex = /@keyframes terryWrapDraw \{[\s\S]*?\}/;

const replacement = `@keyframes terryWrapDraw {
                0% { stroke-dashoffset: 648; }
                35% { stroke-dashoffset: 0; }
                40% { stroke-dashoffset: 0; }
                75% { stroke-dashoffset: -648; }
                100% { stroke-dashoffset: -648; }
              }`;

if (regex.test(code)) {
  fs.writeFileSync(file, code.replace(regex, replacement));
  console.log('Fixed SVG path offset math in Header.tsx');
} else {
  console.error('Target keyframes block not found.');
}
