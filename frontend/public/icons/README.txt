Покладіть сюди іконки PWA:
  icon-192.png — 192x192, фон theme_color #111827
  icon-512.png — 512x512, maskable-safe zone

Швидкий варіант (через ImageMagick):
  magick -size 512x512 xc:"#111827" -fill white -gravity center -pointsize 260 -annotate 0 "К" icon-512.png
  magick -size 192x192 xc:"#111827" -fill white -gravity center -pointsize 100 -annotate 0 "К" icon-192.png

Або згенеруйте на https://realfavicongenerator.net/ із логотипу.
