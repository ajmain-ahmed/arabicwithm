# Nunito Sans

Unmodified normal variable font from the official Google Fonts repository,
revision `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`:

- [Original font](https://github.com/google/fonts/blob/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/nunitosans/NunitoSans%5BYTLC%2Copsz%2Cwdth%2Cwght%5D.ttf)
- [Original license](https://github.com/google/fonts/blob/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/nunitosans/OFL.txt)

Redistributed under the SIL Open Font License 1.1; see `OFL.txt`.
Font SHA-256: `f934d7142fb4784bf828da485b7dcbd90c0c80d514e9d49a5da0ed3a1ae2491d`.

`app/lib/fonts.ts` loads this file with `next/font/local`, preserving the existing
`--font-heading` variable, normal style, and requested 400–600 weight range.
The complete font retains its multilingual glyph coverage. Bundling it removes
the build-time Google Fonts request for Nunito Sans without changing Turbopack
or adding dependencies.
