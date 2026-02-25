const fs = require('fs');
const files = [
  'src/hooks/useConceptGeneration.ts',
  'src/hooks/useWorkPackageGeneration.ts',
  'src/components/concept/ConceptDeveloper.tsx',
  'src/components/concept/steps/Step2Sources.tsx',
  'src/components/concept/steps/Step3Consortium.tsx',
  'src/components/concept/steps/Step4Objectives.tsx',
  'src/components/concept/steps/Step5WorkPackages.tsx',
  'src/components/concept/steps/Step6Summary.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\{/g, '{');
  content = content.replace(/\\}/g, '}');
  // Also fix the regex typos
  content = content.replace(/\/```json \/ g/g, '/```json/g');
  content = content.replace(/\/``` \/g/g, '/```/g');
  fs.writeFileSync(file, content);
}
console.log('Fixed escaping in files.');
