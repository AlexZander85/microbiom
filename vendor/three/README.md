# Vendored Three.js — experiment only

Version: **0.186.1**, MIT license (see `LICENSE`). Original distribution files, not edited.

Source: https://registry.npmjs.org/three/-/three-0.186.1.tgz

NPM integrity:
```
sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==
```

SHA256:
```
9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6  three.core.js
9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea  three.module.js
```

Only the renderer lab imports these modules. `index.html` and its standalone remain dependency-free.
The lab's generated standalone bundles the required code locally and embeds the license.
No CDN/import map/network library download at runtime. Do not hand-edit vendored files.
