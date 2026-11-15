from pathlib import Path
from pypdf import PdfReader
pdf=PdfReader('output/pdf/appointify_internship_report.pdf')
assets=Path('tmp/docx_work/assets')
for idx,name in [(6,'homepage.png'),(7,'services.png'),(8,'register.png')]:
    imgs=pdf.pages[idx].images
    if not imgs:
        raise RuntimeError(f'Missing screenshot on report page {idx+1}')
    (assets/name).write_bytes(imgs[0].data)
    print(name, len(imgs[0].data))
