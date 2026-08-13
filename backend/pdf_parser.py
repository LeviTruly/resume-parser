import pymupdf
def extract_text_from_pdf(filepath):
    document = pymupdf.open(filepath)
    text = ""
    for page in document:
        text += page.get_text("text") + "\n"
    document.close()
    return text
