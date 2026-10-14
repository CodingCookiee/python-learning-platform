# Fonts for server-rendered images

The certificate image (`app/certificates/[code]/image/route.tsx`) reads these TrueType files from
disk, so it never depends on reaching Google Fonts while it renders.

- Archivo, by Omnibus-Type: the three widths and weights the certificate uses, instanced from
  Google Fonts' variable font.
- JetBrains Mono, by JetBrains: regular, for the certificate ID.

Both are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org), which allows
bundling and redistribution with software.
