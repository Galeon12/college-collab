import os
from PIL import Image

pub_dir = r'c:\Users\chandan saraswat\Desktop\college_collab\public'
for f in os.listdir(pub_dir):
    if f.lower().endswith('.jpg'):
        path = os.path.join(pub_dir, f)
        try:
            with Image.open(path) as img:
                img.thumbnail((1200, 1200))
                img.save(path, 'JPEG', quality=75)
            print(f'Resized {f}')
        except Exception as e:
            print(f'Error resizing {f}: {e}')
