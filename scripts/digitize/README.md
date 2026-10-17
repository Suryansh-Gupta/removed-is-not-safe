# Digitizing published figures (2026-10-16)

Re-creates `data/published/dodd2005_fig5a.csv` and `data/published/kennedyneth2019_fig2.csv` from the papers' own figure images.

1. Extract the embedded images (PDFs not in the repo for copyright reasons):
   ```
   pdfimages -f 10 -l 10 -png dodd2005.pdf dimg          # 600-dpi 1-bit image, Fig. 5a/5b
   pdfimages -f 6  -l 6  -png kennedyneth2019.pdf kimg   # 300-dpi image, Fig. 2A-F
   python3 -c "from PIL import Image; Image.open('dimg-000.png').crop((0,0,1971,1388)).save('d5a.png')"
   ```
2. Run in this folder, next to the images: `dodd_digit.py` (markers), `dodd_err.py` (error bars), `kn_digit.py` (bars), `write_csv.py` (writes both CSVs).

Method: axes calibrated on tick-mark pixel positions (linear fit residual < 0.001). Dodd: filled circles found by morphological erosion, open circles by ring-template matching; 1 px ≈ 0.0009 C/C0. Kennedy Neth: bar tops and error-bar caps by column scan; 1 px ≈ 0.002. `sd` = half the error bar. Check overlay: `figures/9_digitize_check.png`.
