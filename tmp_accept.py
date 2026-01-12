from zipfile import ZipFile, ZIP_DEFLATED
from pathlib import Path
import xml.etree.ElementTree as ET
import re

src = Path("РџРѕ_РїРѕРІРѕРґСѓ_РґРѕСЂР°Р±РѕС‚РѕРє_СЃР°Р№С‚Р°_PYROMETER_4_1.docx")
if not src.exists():
    raise SystemExit(f"Source file not found: {src}")

dst = src.with_name(src.stem + "_accepted.docx")


def lname(tag: str) -> str:
    return tag.split('}', 1)[-1] if '}' in tag else tag


def cleanse(elem):
    i = 0
    while i < len(elem):
        child = elem[i]
        name = lname(child.tag)
        if name in {"del", "moveFrom", "moveFromRangeStart", "moveFromRangeEnd", "customXmlDelRangeStart", "customXmlDelRangeEnd", "delInstrText", "delText", "delFldChar"}:
            elem.remove(child)
            continue
        if name in {"ins", "moveTo"}:
            cleanse(child)
            elem.remove(child)
            for grandchild in list(child):
                elem.insert(i, grandchild)
                i += 1
            if child.tail:
                if i == 0:
                    elem.text = (elem.text or "") + child.tail
                else:
                    prev = elem[i-1]
                    prev.tail = (prev.tail or "") + child.tail
            continue
        cleanse(child)
        i += 1


def process_xml(data: bytes) -> bytes:
    root = ET.fromstring(data)
    cleanse(root)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)

with ZipFile(src, 'r') as zin, ZipFile(dst, 'w', compression=ZIP_DEFLATED) as zout:
    names = zin.namelist()
    targets = {
        'word/document.xml',
        'word/footnotes.xml',
        'word/endnotes.xml',
    }
    targets.update({n for n in names if re.fullmatch(r"word/header\d+\.xml", n)})
    targets.update({n for n in names if re.fullmatch(r"word/footer\d+\.xml", n)})

    for name in names:
        data = zin.read(name)
        if name in targets:
            data = process_xml(data)
        zout.writestr(name, data)

print(f"Written: {dst}")
