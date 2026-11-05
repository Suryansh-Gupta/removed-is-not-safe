# /// script
# requires-python = ">=3.10"
# dependencies = ["rdkit"]
# ///
"""2D coordinates of ciprofloxacin from its SMILES, for the schematic plate. Real connectivity, not hand-drawn."""
import json
from rdkit import Chem
from rdkit.Chem import AllChem, Draw, rdMolDescriptors
smi="C1CC1N2C=C(C(=O)C3=CC(=C(C=C32)N4CCNCC4)F)C(=O)O"
m=Chem.MolFromSmiles(smi); AllChem.Compute2DCoords(m)
c=m.GetConformer()
print(rdMolDescriptors.CalcMolFormula(m))
pip=m.GetSubstructMatch(Chem.MolFromSmarts("N1CCNCC1"))
quin=m.GetSubstructMatch(Chem.MolFromSmarts("O=C1C=CNc2ccccc12"))
atoms=[dict(i=a.GetIdx(),el=a.GetSymbol(),x=round(c.GetAtomPosition(a.GetIdx()).x,3),y=round(c.GetAtomPosition(a.GetIdx()).y,3),pip=a.GetIdx() in pip,quin=a.GetIdx() in quin) for a in m.GetAtoms()]
bonds=[dict(a=b.GetBeginAtomIdx(),b=b.GetEndAtomIdx(),o=b.GetBondTypeAsDouble(),ar=b.GetIsAromatic()) for b in m.GetBonds()]
Chem.Kekulize(m,clearAromaticFlags=True)
for k,b in zip(bonds,m.GetBonds()): k['o']=b.GetBondTypeAsDouble()
json.dump(dict(atoms=atoms,bonds=bonds),open("film/src/cipro.json","w"))
print(len(atoms),len(bonds),'pip',pip,'quin',quin)
